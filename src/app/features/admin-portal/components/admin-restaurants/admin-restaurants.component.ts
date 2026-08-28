import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminMenuItem, AdminMenuItemCreate, AdminService, CatalogCategory, CatalogSubcategory } from '../../../../core/services/admin.service';
import { AdminRestaurantRow, RestaurantCreatePayload, RestaurantUpdatePayload } from '../../../../core/models/restaurant.model';
import { PaymentSettingsService } from '../../../../core/services/payment-settings.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({ selector:'app-admin-restaurants', standalone:true, imports:[FormsModule, PortalPageHeaderComponent], templateUrl:'./admin-restaurants.component.html', styleUrl:'./admin-restaurants.component.scss' })
export class AdminRestaurantsComponent implements OnInit {
  restaurants=signal<AdminRestaurantRow[]>([]); saving=signal(false); error=signal(''); success=signal('');
  impersonatingId=signal<number|null>(null);
  addRestaurantOpen=signal(false);
  catalogCategories=signal<CatalogCategory[]>([]);
  bannerPreview=signal<string|null>(null); bannerUploading=signal(false); uploadError=signal('');
  desktopHeroPreview=signal<string|null>(null); mobileHeroPreview=signal<string|null>(null);
  desktopHeroUploading=signal(false); mobileHeroUploading=signal(false);
  restaurantPhone=''; ownerPhone='';
  newRestaurant:RestaurantCreatePayload={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',owner_username:'',owner_password:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',banner_url:'',banner_mobile_url:'',business_category_id:null,is_approved:true};
  editForm:RestaurantUpdatePayload&{owner_phone?:string;restaurant_phone?:string;has_password?:boolean;owner_password?:string}={};
  editOpen=signal(false); editSaving=signal(false); editError=signal(''); editId:number|null=null;
  editBannerPreview=signal<string|null>(null); editDesktopHeroPreview=signal<string|null>(null); editMobileHeroPreview=signal<string|null>(null);
  editBannerUploading=signal(false); editDesktopHeroUploading=signal(false); editMobileHeroUploading=signal(false);
  menuOpen=signal(false); menuRestaurantId=signal(0); menuName=signal(''); menuItems=signal<AdminMenuItem[]>([]); menuLoading=signal(false); menuSaving=signal(false); menuError=signal(''); deletingId=signal<number|null>(null);
  menuSubcategories=signal<CatalogSubcategory[]>([]);
  menuBusinessCategoryId=signal(0);
  displayPriceMarkup=signal(30);
  editingMenuItemId=signal<number|null>(null);
  menuImagePreview=signal<string|null>(null);
  menuImageUploading=signal(false);
  hasVariants=signal(false);
  variantDrafts:{label:string;actual_price:number|null;original_price:number|null}[]=[];
  newMenuItem:AdminMenuItemCreate={name:'',description:'',price:0,actual_price:0,category_name:'Other',subcategory_id:null,is_veg:true,is_bestseller:false};
  readonly bannerSpec={label:'Restaurant Card',hint:'Shown on home page and restaurants list (desktop + mobile)',size:'600 × 400 px (3:2)',formats:'JPG, PNG, or WebP · max 2 MB'};
  readonly desktopHeroSpec={label:'Hotel Hero Banner — Desktop',hint:'Shown on restaurant menu page for desktop screens',size:'1600 × 600 px (~8:3)',formats:'JPG, PNG, or WebP · max 2 MB'};
  readonly mobileHeroSpec={label:'Hotel Hero Banner — Mobile',hint:'Shown on restaurant menu page for mobile screens',size:'1080 × 720 px (3:2)',formats:'JPG, PNG, or WebP · max 2 MB'};
  constructor(
    private admin:AdminService,
    private paymentSettings:PaymentSettingsService,
    private auth:AuthService,
    private router:Router,
  ){}
  ngOnInit(){this.load();this.loadCatalog();this.loadPriceMarkup();}
  loadCatalog(){this.admin.getCatalogCategories().subscribe(categories=>{this.catalogCategories.set(categories.filter(item=>item.is_active));const restaurant=categories.find(item=>item.slug==='restaurant'&&item.is_active);if(!this.newRestaurant.business_category_id)this.newRestaurant.business_category_id=restaurant?.id||categories[0]?.id||null;});}
  loadPriceMarkup(){this.paymentSettings.getSettings().subscribe({next:s=>this.displayPriceMarkup.set(s.display_price_markup_percent),error:()=>this.displayPriceMarkup.set(30)});}
  calculatedDisplayPrice(transfer:number|null|undefined){const t=Number(transfer)||0;return Math.round(t*(1+this.displayPriceMarkup()/100)*100)/100;}
  enableVariants(){this.hasVariants.set(true);this.variantDrafts=[{label:'Half',actual_price:null,original_price:null},{label:'Full',actual_price:null,original_price:null}];}
  disableVariants(){this.hasVariants.set(false);this.variantDrafts=[];}
  addVariantRow(){this.variantDrafts=[...this.variantDrafts,{label:'',actual_price:null,original_price:null}];}
  removeVariantRow(index:number){if(this.variantDrafts.length<=1)return;this.variantDrafts=this.variantDrafts.filter((_,i)=>i!==index);}
  load(){this.admin.getRestaurants().subscribe(v=>this.restaurants.set(v));}
  impersonate(r:AdminRestaurantRow){
    if(!confirm(`Open the hotel dashboard as "${r.name}"?`))return;
    this.error.set('');
    this.impersonatingId.set(r.id);
    this.admin.impersonateRestaurant(r.id).subscribe({
      next:session=>{
        const started=this.auth.startRestaurantImpersonation({
          access_token:session.access_token,
          role:session.role,
          user_id:session.user_id,
          full_name:session.full_name||r.name,
          phone:session.phone||undefined,
          restaurant_id:session.restaurant_id,
          restaurant_name:session.restaurant_name,
          impersonated_by:session.impersonated_by,
          impersonation_session_id:session.impersonation_session_id,
          redirect_to:session.redirect_to,
        });
        this.impersonatingId.set(null);
        if(started) {
          const hotelUrl = `https://hotel.lalganjeats.com/auth/hotel-login?impersonate_token=${encodeURIComponent(session.access_token)}`;
          window.open(hotelUrl, '_blank') || (window.location.href = hotelUrl);
        } else this.error.set('Only a tenant admin can impersonate a restaurant.');
      },
      error:e=>{
        this.impersonatingId.set(null);
        this.error.set(
          typeof e.error?.detail==='string'
            ? e.error.detail
            : 'Could not open restaurant dashboard.'
        );
      },
    });
  }
  phone(value:string,field:'restaurant'|'owner'){const v=value.replace(/\D/g,'').slice(0,10);field==='restaurant'?this.restaurantPhone=v:this.ownerPhone=v;}
  create(){
    this.error.set('');this.success.set('');
    if(!this.newRestaurant.name.trim()){this.error.set('Restaurant name is required.');return}
    if(this.ownerPhone.length!==10){this.error.set('Enter a valid 10-digit owner mobile number.');return}
    if(this.restaurantPhone&&this.restaurantPhone.length!==10){this.error.set('Restaurant phone must be exactly 10 digits.');return}
    this.saving.set(true);
    this.admin.createRestaurant({
      ...this.newRestaurant,
      owner_phone: this.ownerPhone,
      phone: this.restaurantPhone || undefined,
      owner_username: this.newRestaurant.owner_username?.trim() || undefined,
      owner_password: this.newRestaurant.owner_password?.trim() || undefined,
      latitude: this.newRestaurant.latitude ?? null,
      longitude: this.newRestaurant.longitude ?? null,
    }).subscribe({
      next:()=>{this.saving.set(false);this.success.set('Restaurant added successfully.');this.addRestaurantOpen.set(false);const categoryId=this.newRestaurant.business_category_id;this.newRestaurant={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',owner_username:'',owner_password:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',banner_url:'',banner_mobile_url:'',business_category_id:categoryId,is_approved:true};this.restaurantPhone='';this.ownerPhone='';this.bannerPreview.set(null);this.desktopHeroPreview.set(null);this.mobileHeroPreview.set(null);this.load();},
      error:e=>{this.saving.set(false);this.error.set(e.error?.detail||'Failed to add restaurant.')}
    });
  }
  selectBanner(
    event: Event,
    slot: 'card' | 'desktop' | 'mobile' = 'card',
    editing = false,
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const setError = (v: string) => editing ? this.editError.set(v) : this.uploadError.set(v);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload JPG, PNG, or WebP only.');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2 MB or smaller.');
      input.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    const purpose =
      slot === 'card' ? 'list_banner' : slot === 'desktop' ? 'menu_banner' : 'menu_banner_mobile';
    const setUploading = (v: boolean) => {
      if (editing) {
        if (slot === 'card') this.editBannerUploading.set(v);
        else if (slot === 'desktop') this.editDesktopHeroUploading.set(v);
        else this.editMobileHeroUploading.set(v);
      } else {
        if (slot === 'card') this.bannerUploading.set(v);
        else if (slot === 'desktop') this.desktopHeroUploading.set(v);
        else this.mobileHeroUploading.set(v);
      }
    };
    const setPreview = (value: string | null) => {
      if (editing) {
        if (slot === 'card') this.editBannerPreview.set(value);
        else if (slot === 'desktop') this.editDesktopHeroPreview.set(value);
        else this.editMobileHeroPreview.set(value);
      } else {
        if (slot === 'card') this.bannerPreview.set(value);
        else if (slot === 'desktop') this.desktopHeroPreview.set(value);
        else this.mobileHeroPreview.set(value);
      }
    };
    setPreview(url);
    setUploading(true);
    this.admin.uploadBanner(file, purpose).subscribe({
      next: r => {
        if (editing) {
          if (slot === 'card') this.editForm.list_banner_url = r.url;
          else if (slot === 'desktop') this.editForm.banner_url = r.url;
          else this.editForm.banner_mobile_url = r.url;
        } else {
          if (slot === 'card') this.newRestaurant.list_banner_url = r.url;
          else if (slot === 'desktop') this.newRestaurant.banner_url = r.url;
          else this.newRestaurant.banner_mobile_url = r.url;
        }
        setUploading(false);
        input.value = '';
      },
      error: e => {
        setUploading(false);
        setPreview(null);
        setError(e.error?.detail || 'Failed to upload image.');
        input.value = '';
      },
    });
  }
  approve(id:number){this.admin.approveRestaurant(id).subscribe(()=>this.load());}
  openEdit(r:AdminRestaurantRow){
    this.editId=r.id;this.editError.set('');
    this.editForm={
      name:r.name,description:r.description??'',phone:r.phone??'',address:r.address??'',city:r.city??'Lalganj',
      pincode:r.pincode??'',latitude:r.latitude??null,longitude:r.longitude??null,logo_url:r.logo_url??'',
      list_banner_url:r.list_banner_url??'',banner_url:r.banner_url??'',banner_mobile_url:r.banner_mobile_url??'',
      business_category_id:r.business_category_id??null,is_open:r.is_open,is_approved:r.is_approved,is_active:r.is_active,
      owner_name:r.owner??'',owner_phone:r.owner_phone??'',owner_username:r.owner_username??'',owner_password:'',
      has_password:!!r.has_password,restaurant_phone:(r.phone??'').replace(/\D/g,'').slice(-10)
    };
    this.editBannerPreview.set(r.list_banner_url||null);
    this.editDesktopHeroPreview.set(r.banner_url||null);
    this.editMobileHeroPreview.set(r.banner_mobile_url||null);
    this.editOpen.set(true);
  }
  closeEdit(){
    this.editOpen.set(false);this.editId=null;this.editError.set('');
    this.editBannerUploading.set(false);this.editDesktopHeroUploading.set(false);this.editMobileHeroUploading.set(false);
  }
  editPhone(v:string){this.editForm.restaurant_phone=v.replace(/\D/g,'').slice(0,10);}
  saveEdit(){
    if(!this.editId)return;this.editError.set('');
    if(!this.editForm.name?.trim()){this.editError.set('Restaurant name is required.');return}
    const phone=this.editForm.restaurant_phone||'';if(phone&&phone.length!==10){this.editError.set('Restaurant phone must be exactly 10 digits.');return}
    const p:RestaurantUpdatePayload={name:this.editForm.name.trim(),description:this.editForm.description||null,phone:phone||null,address:this.editForm.address||null,city:this.editForm.city||'Lalganj',pincode:this.editForm.pincode||null,latitude:this.editForm.latitude!=null&&this.editForm.latitude!==('' as any)?Number(this.editForm.latitude):null,longitude:this.editForm.longitude!=null&&this.editForm.longitude!==('' as any)?Number(this.editForm.longitude):null,logo_url:this.editForm.logo_url||null,list_banner_url:this.editForm.list_banner_url||null,banner_url:this.editForm.banner_url||null,banner_mobile_url:this.editForm.banner_mobile_url||null,business_category_id:this.editForm.business_category_id??null,is_open:this.editForm.is_open,is_approved:this.editForm.is_approved,is_active:this.editForm.is_active,owner_name:this.editForm.owner_name||null,owner_username:(this.editForm.owner_username||'').trim()||null,owner_password:(this.editForm.owner_password||'').trim()||null};
    this.editSaving.set(true);this.admin.updateRestaurant(this.editId,p).subscribe({next:()=>{this.editSaving.set(false);this.closeEdit();this.success.set('Restaurant updated.');this.load();},error:e=>{this.editSaving.set(false);this.editError.set(typeof e.error?.detail==='string'?e.error.detail:'Failed to update restaurant.')}});
  }
  openMenu(r:AdminRestaurantRow){this.menuRestaurantId.set(r.id);this.menuName.set(r.name);this.menuBusinessCategoryId.set(r.business_category_id||0);this.menuOpen.set(true);this.menuError.set('');this.resetMenu();this.loadMenu();this.loadMenuSubcategories();}
  loadMenuSubcategories(){if(!this.menuBusinessCategoryId()){this.menuSubcategories.set([]);return}this.admin.getCatalogSubcategories(this.menuBusinessCategoryId()).subscribe(items=>this.menuSubcategories.set(items.filter(item=>item.is_active)));}
  resetMenu(){this.editingMenuItemId.set(null);this.newMenuItem={name:'',description:'',image_url:null,price:0,actual_price:0,category_name:'Other',subcategory_id:null,is_veg:true,is_bestseller:false};this.menuImagePreview.set(null);this.menuImageUploading.set(false);this.disableVariants();}
  editMenuItem(item:AdminMenuItem){
    this.editingMenuItemId.set(item.id);this.menuError.set('');
    this.newMenuItem={name:item.name,description:item.description||'',image_url:item.image_url||null,price:item.price,actual_price:item.actual_price,original_price:item.original_price,category_name:item.category,subcategory_id:item.subcategory_id??null,is_veg:item.is_veg,is_bestseller:item.is_bestseller};
    this.menuImagePreview.set(item.image_url||null);
    if(item.variants?.length){this.hasVariants.set(true);this.variantDrafts=item.variants.map(v=>({label:v.label,actual_price:v.actual_price,original_price:v.original_price??null}));}
    else{this.disableVariants();}
    setTimeout(()=>document.querySelector('.menu-form')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  selectMenuImage(event:Event){
    const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
    this.menuError.set('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){this.menuError.set('Menu item image must be JPG, PNG, or WebP.');input.value='';return}
    if(file.size>2*1024*1024){this.menuError.set('Menu item image must be 2 MB or smaller.');input.value='';return}
    this.menuImagePreview.set(URL.createObjectURL(file));this.menuImageUploading.set(true);
    this.admin.uploadBanner(file,'menu_item').subscribe({
      next:r=>{this.newMenuItem.image_url=r.url;this.menuImagePreview.set(r.url);this.menuImageUploading.set(false);input.value='';},
      error:e=>{this.menuImagePreview.set(null);this.newMenuItem.image_url=null;this.menuImageUploading.set(false);this.menuError.set(e.error?.detail||'Failed to upload menu item image.');input.value='';}
    });
  }
  removeMenuImage(){this.menuImagePreview.set(null);this.newMenuItem.image_url=null;}
  loadMenu(){this.menuLoading.set(true);this.admin.getRestaurantMenu(this.menuRestaurantId()).subscribe({next:v=>{this.menuItems.set(v);this.menuLoading.set(false)},error:()=>this.menuLoading.set(false)});}
  addItem(){
    this.menuError.set('');
    if(!this.newMenuItem.name.trim()){this.menuError.set('Item name is required.');return}
    if(!this.newMenuItem.subcategory_id){this.menuError.set('Choose a subcategory.');return}
    const variants=this.hasVariants()
      ? this.variantDrafts
          .map(v=>({label:(v.label||'').trim(),actual_price:Number(v.actual_price)||0,original_price:v.original_price!=null?Number(v.original_price):null}))
          .filter(v=>v.label && v.actual_price>0)
      : [];
    if(this.hasVariants()&&!variants.length){this.menuError.set('Add at least one variant with its seller transfer price.');return}
    if(!this.hasVariants()){
      const transfer=Number(this.newMenuItem.actual_price)||0;
      const display=this.calculatedDisplayPrice(transfer);
      if(transfer<=0){this.menuError.set('Seller transfer price is required.');return}
      if(this.newMenuItem.original_price!=null&&Number(this.newMenuItem.original_price)<display){this.menuError.set(`MRP cannot be lower than display ₹${display}.`);return}
    }else{
      for(const v of variants){
        const display=this.calculatedDisplayPrice(v.actual_price);
        if(v.original_price!=null && v.original_price<display){this.menuError.set(`MRP for ${v.label} cannot be lower than display ₹${display}.`);return}
      }
    }
    const subcategory=this.menuSubcategories().find(item=>item.id===Number(this.newMenuItem.subcategory_id));
    const payload:AdminMenuItemCreate={
      ...this.newMenuItem,
      category_name:subcategory?.name||'Other',
      actual_price:this.hasVariants()?variants[0].actual_price:Number(this.newMenuItem.actual_price),
      original_price:this.hasVariants()?variants[0].original_price:this.newMenuItem.original_price,
      price:this.calculatedDisplayPrice(this.hasVariants()?variants[0].actual_price:this.newMenuItem.actual_price),
      variants:this.hasVariants()?variants.map(v=>({label:v.label,actual_price:v.actual_price,original_price:v.original_price})):undefined,
    };
    this.menuSaving.set(true);
    const editingId=this.editingMenuItemId();
    const request=editingId
      ? this.admin.updateMenuItem(this.menuRestaurantId(),editingId,payload)
      : this.admin.addMenuItem(this.menuRestaurantId(),payload);
    request.subscribe({
      next:i=>{this.menuItems.update(v=>editingId?v.map(x=>x.id===editingId?i:x):[...v,i]);this.resetMenu();this.menuSaving.set(false)},
      error:e=>{this.menuError.set(e.error?.detail||'Failed to add item.');this.menuSaving.set(false)}
    });
  }
  toggleItem(i:AdminMenuItem){this.admin.toggleMenuItem(this.menuRestaurantId(),i.id).subscribe(r=>this.menuItems.update(v=>v.map(x=>x.id===i.id?{...x,is_available:r.is_available}:x)));}
  deleteItem(i:AdminMenuItem){if(!confirm(`Delete "${i.name}"?`))return;this.deletingId.set(i.id);this.admin.deleteMenuItem(this.menuRestaurantId(),i.id).subscribe({next:()=>{this.menuItems.update(v=>v.filter(x=>x.id!==i.id));this.deletingId.set(null)},error:()=>this.deletingId.set(null)});}
}
