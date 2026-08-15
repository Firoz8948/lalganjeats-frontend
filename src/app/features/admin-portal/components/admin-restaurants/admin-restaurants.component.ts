import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminMenuItem, AdminMenuItemCreate, AdminService, CatalogCategory, CatalogSubcategory } from '../../../../core/services/admin.service';
import { AdminRestaurantRow, RestaurantCreatePayload, RestaurantUpdatePayload } from '../../../../core/models/restaurant.model';
import { PaymentSettingsService } from '../../../../core/services/payment-settings.service';

@Component({ selector:'app-admin-restaurants', standalone:true, imports:[FormsModule], templateUrl:'./admin-restaurants.component.html', styleUrl:'./admin-restaurants.component.scss' })
export class AdminRestaurantsComponent implements OnInit {
  restaurants=signal<AdminRestaurantRow[]>([]); saving=signal(false); error=signal(''); success=signal('');
  catalogCategories=signal<CatalogCategory[]>([]);
  bannerPreview=signal<string|null>(null); bannerUploading=signal(false); uploadError=signal('');
  restaurantPhone=''; ownerPhone='';
  newRestaurant:RestaurantCreatePayload={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',business_category_id:null,is_approved:true};
  editOpen=signal(false); editSaving=signal(false); editError=signal(''); editId:number|null=null; editBannerPreview=signal<string|null>(null); editBannerUploading=signal(false);
  editForm:RestaurantUpdatePayload&{owner_phone?:string;restaurant_phone?:string}={};
  menuOpen=signal(false); menuRestaurantId=signal(0); menuName=signal(''); menuItems=signal<AdminMenuItem[]>([]); menuLoading=signal(false); menuSaving=signal(false); menuError=signal(''); deletingId=signal<number|null>(null);
  menuSubcategories=signal<CatalogSubcategory[]>([]);
  menuBusinessCategoryId=signal(0);
  displayPriceMarkup=signal(30);
  variantDrafts:{label:string;actual_price:number|null;original_price:number|null}[]=[
    {label:'Half',actual_price:null,original_price:null},
    {label:'Full',actual_price:null,original_price:null},
  ];
  newMenuItem:AdminMenuItemCreate={name:'',description:'',price:0,actual_price:0,category_name:'Other',subcategory_id:null,is_veg:true,is_bestseller:false};
  readonly bannerSpec={label:'Restaurant Card Banner',hint:'Shown on the restaurant card in home page & restaurants list',size:'600 × 400 px (3:2 ratio)',formats:'JPG, PNG, or WebP · max 2 MB'};
  constructor(private admin:AdminService, private paymentSettings:PaymentSettingsService){}
  ngOnInit(){this.load();this.loadCatalog();this.loadPriceMarkup();}
  loadCatalog(){this.admin.getCatalogCategories().subscribe(categories=>{this.catalogCategories.set(categories.filter(item=>item.is_active));const restaurant=categories.find(item=>item.slug==='restaurant'&&item.is_active);if(!this.newRestaurant.business_category_id)this.newRestaurant.business_category_id=restaurant?.id||categories[0]?.id||null;});}
  loadPriceMarkup(){this.paymentSettings.getSettings().subscribe({next:s=>this.displayPriceMarkup.set(s.display_price_markup_percent),error:()=>this.displayPriceMarkup.set(30)});}
  calculatedDisplayPrice(transfer:number|null|undefined){const t=Number(transfer)||0;return Math.round(t*(1+this.displayPriceMarkup()/100)*100)/100;}
  addVariantRow(){this.variantDrafts=[...this.variantDrafts,{label:'',actual_price:null,original_price:null}];}
  removeVariantRow(index:number){if(this.variantDrafts.length<=1)return;this.variantDrafts=this.variantDrafts.filter((_,i)=>i!==index);}
  load(){this.admin.getRestaurants().subscribe(v=>this.restaurants.set(v));}
  phone(value:string,field:'restaurant'|'owner'){const v=value.replace(/\D/g,'').slice(0,10);field==='restaurant'?this.restaurantPhone=v:this.ownerPhone=v;}
  create(){
    this.error.set('');this.success.set('');
    if(!this.newRestaurant.name.trim()){this.error.set('Restaurant name is required.');return}
    if(this.ownerPhone.length!==10){this.error.set('Enter a valid 10-digit owner mobile number.');return}
    if(this.restaurantPhone&&this.restaurantPhone.length!==10){this.error.set('Restaurant phone must be exactly 10 digits.');return}
    this.saving.set(true);
    this.admin.createRestaurant({...this.newRestaurant,owner_phone:this.ownerPhone,phone:this.restaurantPhone||undefined,latitude:this.newRestaurant.latitude??null,longitude:this.newRestaurant.longitude??null}).subscribe({
      next:()=>{this.saving.set(false);this.success.set('Restaurant added successfully.');const categoryId=this.newRestaurant.business_category_id;this.newRestaurant={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',business_category_id:categoryId,is_approved:true};this.restaurantPhone='';this.ownerPhone='';this.bannerPreview.set(null);this.load();},
      error:e=>{this.saving.set(false);this.error.set(e.error?.detail||'Failed to add restaurant.')}
    });
  }
  selectBanner(event:Event,editing=false){
    const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
    const setError=(v:string)=>editing?this.editError.set(v):this.uploadError.set(v);
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Please upload JPG, PNG, or WebP only.');input.value='';return}
    if(file.size>2*1024*1024){setError('Image must be 2 MB or smaller.');input.value='';return}
    const url=URL.createObjectURL(file); editing?this.editBannerPreview.set(url):this.bannerPreview.set(url); editing?this.editBannerUploading.set(true):this.bannerUploading.set(true);
    this.admin.uploadBanner(file,'list_banner').subscribe({next:r=>{if(editing)this.editForm.list_banner_url=r.url;else this.newRestaurant.list_banner_url=r.url;editing?this.editBannerUploading.set(false):this.bannerUploading.set(false);input.value='';},error:e=>{editing?this.editBannerUploading.set(false):this.bannerUploading.set(false);setError(e.error?.detail||'Failed to upload image.');input.value='';}});
  }
  approve(id:number){this.admin.approveRestaurant(id).subscribe(()=>this.load());}
  openEdit(r:AdminRestaurantRow){this.editId=r.id;this.editError.set('');this.editForm={name:r.name,description:r.description??'',phone:r.phone??'',address:r.address??'',city:r.city??'Lalganj',pincode:r.pincode??'',latitude:r.latitude??null,longitude:r.longitude??null,logo_url:r.logo_url??'',list_banner_url:r.list_banner_url??'',banner_url:r.banner_url??'',business_category_id:r.business_category_id??null,is_open:r.is_open,is_approved:r.is_approved,is_active:r.is_active,owner_name:r.owner??'',owner_phone:r.owner_phone??'',restaurant_phone:(r.phone??'').replace(/\D/g,'').slice(-10)};this.editBannerPreview.set(r.list_banner_url||null);this.editOpen.set(true);}
  closeEdit(){this.editOpen.set(false);this.editId=null;this.editError.set('');this.editBannerUploading.set(false);}
  editPhone(v:string){this.editForm.restaurant_phone=v.replace(/\D/g,'').slice(0,10);}
  saveEdit(){
    if(!this.editId)return;this.editError.set('');
    if(!this.editForm.name?.trim()){this.editError.set('Restaurant name is required.');return}
    const phone=this.editForm.restaurant_phone||'';if(phone&&phone.length!==10){this.editError.set('Restaurant phone must be exactly 10 digits.');return}
    const p:RestaurantUpdatePayload={name:this.editForm.name.trim(),description:this.editForm.description||null,phone:phone||null,address:this.editForm.address||null,city:this.editForm.city||'Lalganj',pincode:this.editForm.pincode||null,latitude:this.editForm.latitude!=null&&this.editForm.latitude!==('' as any)?Number(this.editForm.latitude):null,longitude:this.editForm.longitude!=null&&this.editForm.longitude!==('' as any)?Number(this.editForm.longitude):null,logo_url:this.editForm.logo_url||null,list_banner_url:this.editForm.list_banner_url||null,banner_url:this.editForm.banner_url||null,business_category_id:this.editForm.business_category_id??null,is_open:this.editForm.is_open,is_approved:this.editForm.is_approved,is_active:this.editForm.is_active,owner_name:this.editForm.owner_name||null};
    this.editSaving.set(true);this.admin.updateRestaurant(this.editId,p).subscribe({next:()=>{this.editSaving.set(false);this.closeEdit();this.success.set('Restaurant updated.');this.load();},error:e=>{this.editSaving.set(false);this.editError.set(typeof e.error?.detail==='string'?e.error.detail:'Failed to update restaurant.')}});
  }
  openMenu(r:AdminRestaurantRow){this.menuRestaurantId.set(r.id);this.menuName.set(r.name);this.menuBusinessCategoryId.set(r.business_category_id||0);this.menuOpen.set(true);this.menuError.set('');this.resetMenu();this.loadMenu();this.loadMenuSubcategories();}
  loadMenuSubcategories(){if(!this.menuBusinessCategoryId()){this.menuSubcategories.set([]);return}this.admin.getCatalogSubcategories(this.menuBusinessCategoryId()).subscribe(items=>this.menuSubcategories.set(items.filter(item=>item.is_active)));}
  resetMenu(){this.newMenuItem={name:'',description:'',price:0,actual_price:0,category_name:'Other',subcategory_id:null,is_veg:true,is_bestseller:false};this.variantDrafts=[{label:'Half',actual_price:null,original_price:null},{label:'Full',actual_price:null,original_price:null}];}
  loadMenu(){this.menuLoading.set(true);this.admin.getRestaurantMenu(this.menuRestaurantId()).subscribe({next:v=>{this.menuItems.set(v);this.menuLoading.set(false)},error:()=>this.menuLoading.set(false)});}
  addItem(){
    this.menuError.set('');
    if(!this.newMenuItem.name.trim()){this.menuError.set('Item name is required.');return}
    if(!this.newMenuItem.subcategory_id){this.menuError.set('Choose a subcategory.');return}
    const variants=this.variantDrafts
      .map(v=>({label:(v.label||'').trim(),actual_price:Number(v.actual_price)||0,original_price:v.original_price!=null&&v.original_price!==(null as any)?Number(v.original_price):null}))
      .filter(v=>v.label && v.actual_price>0);
    if(!variants.length){this.menuError.set('Add at least one variant (e.g. Half / Full) with seller transfer price.');return}
    for(const v of variants){
      const display=this.calculatedDisplayPrice(v.actual_price);
      if(v.original_price!=null && v.original_price<display){this.menuError.set(`MRP for ${v.label} cannot be lower than display ₹${display}.`);return}
    }
    const subcategory=this.menuSubcategories().find(item=>item.id===Number(this.newMenuItem.subcategory_id));
    const payload:AdminMenuItemCreate={
      ...this.newMenuItem,
      category_name:subcategory?.name||'Other',
      actual_price:variants[0].actual_price,
      original_price:variants[0].original_price,
      price:this.calculatedDisplayPrice(variants[0].actual_price),
      variants:variants.map(v=>({label:v.label,actual_price:v.actual_price,original_price:v.original_price})),
    };
    this.menuSaving.set(true);
    this.admin.addMenuItem(this.menuRestaurantId(),payload).subscribe({
      next:i=>{this.menuItems.update(v=>[...v,i]);this.resetMenu();this.menuSaving.set(false)},
      error:e=>{this.menuError.set(e.error?.detail||'Failed to add item.');this.menuSaving.set(false)}
    });
  }
  toggleItem(i:AdminMenuItem){this.admin.toggleMenuItem(this.menuRestaurantId(),i.id).subscribe(r=>this.menuItems.update(v=>v.map(x=>x.id===i.id?{...x,is_available:r.is_available}:x)));}
  deleteItem(i:AdminMenuItem){if(!confirm(`Delete "${i.name}"?`))return;this.deletingId.set(i.id);this.admin.deleteMenuItem(this.menuRestaurantId(),i.id).subscribe({next:()=>{this.menuItems.update(v=>v.filter(x=>x.id!==i.id));this.deletingId.set(null)},error:()=>this.deletingId.set(null)});}
}
