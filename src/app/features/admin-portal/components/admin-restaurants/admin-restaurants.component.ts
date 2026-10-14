import { PortalPageHeaderComponent } from '../../../../shared/portal-page-header/portal-page-header.component';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService, CatalogCategory, MAX_IMAGE_UPLOAD_BYTES, MAX_IMAGE_UPLOAD_MB } from '../../../../core/services/admin.service';
import { AdminRestaurantRow, RestaurantCardSlide, RestaurantCreatePayload, RestaurantUpdatePayload } from '../../../../core/models/restaurant.model';
import { AuthService } from '../../../../core/services/auth.service';

type CardSlideDraft = { image_url: string; text: string };

@Component({ selector:'app-admin-restaurants', standalone:true, imports:[FormsModule, RouterLink, PortalPageHeaderComponent], templateUrl:'./admin-restaurants.component.html', styleUrl:'./admin-restaurants.component.scss' })
export class AdminRestaurantsComponent implements OnInit {
  restaurants=signal<AdminRestaurantRow[]>([]); saving=signal(false); error=signal(''); success=signal('');
  impersonatingId=signal<number|null>(null);
  addRestaurantOpen=signal(false);
  catalogCategories=signal<CatalogCategory[]>([]);
  bannerUploading=signal(false); uploadError=signal('');
  desktopHeroPreview=signal<string|null>(null); mobileHeroPreview=signal<string|null>(null);
  desktopHeroUploading=signal(false); mobileHeroUploading=signal(false);
  cardSlides: CardSlideDraft[] = this.blankSlides();
  editCardSlides: CardSlideDraft[] = this.blankSlides();
  cardSlideUploading = signal<boolean[]>([false, false, false, false, false]);
  editCardSlideUploading = signal<boolean[]>([false, false, false, false, false]);
  restaurantPhone=''; ownerPhone='';
  newRestaurant:RestaurantCreatePayload={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',owner_username:'',owner_password:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',card_slides:[],banner_url:'',banner_mobile_url:'',business_category_id:null,is_approved:true,show_packing_charge:false,packing_charge:null,opening_time:'10:00',closing_time:'22:00'};
  editForm:RestaurantUpdatePayload&{owner_phone?:string;restaurant_phone?:string;has_password?:boolean;owner_password?:string}={};
  editOpen=signal(false); editSaving=signal(false); editError=signal(''); editId:number|null=null;
  editDesktopHeroPreview=signal<string|null>(null); editMobileHeroPreview=signal<string|null>(null);
  editDesktopHeroUploading=signal(false); editMobileHeroUploading=signal(false);
  readonly bannerSpec={label:'Restaurant Card slides',hint:'Up to 5 images on the home/list restaurant card (210px). Empty slides stay hidden.',size:'Fixed card height: 210px (e.g. 600 × 420 px / ~4:3)',formats:`JPG, PNG, or WebP · max ${MAX_IMAGE_UPLOAD_MB} MB`};
  readonly desktopHeroSpec={label:'Hotel Hero Banner — Desktop',hint:'Shown on restaurant menu page for desktop screens',size:'1600 × 600 px (~8:3)',formats:`JPG, PNG, or WebP · max ${MAX_IMAGE_UPLOAD_MB} MB`};
  readonly mobileHeroSpec={label:'Hotel Hero Banner — Mobile',hint:'Shown on restaurant menu page for mobile screens',size:'1080 × 720 px (3:2)',formats:`JPG, PNG, or WebP · max ${MAX_IMAGE_UPLOAD_MB} MB`};
  constructor(
    private admin:AdminService,
    private auth:AuthService,
    private router:Router,
  ){}
  blankSlides(): CardSlideDraft[] {
    return Array.from({ length: 5 }, () => ({ image_url: '', text: '' }));
  }
  slidesFromRow(slides?: RestaurantCardSlide[] | null, fallback?: string | null): CardSlideDraft[] {
    const next = this.blankSlides();
    const source = (slides && slides.length)
      ? slides
      : (fallback ? [{ image_url: fallback, text: null }] : []);
    source.slice(0, 5).forEach((slide, i) => {
      next[i] = { image_url: slide.image_url || '', text: slide.text || '' };
    });
    return next;
  }
  packedSlides(slides: CardSlideDraft[]): RestaurantCardSlide[] {
    return slides
      .filter((slide) => !!slide.image_url?.trim())
      .map((slide) => ({
        image_url: slide.image_url.trim(),
        text: slide.text?.trim() || null,
      }));
  }
  anyCardSlideUploading(editing = false): boolean {
    return (editing ? this.editCardSlideUploading() : this.cardSlideUploading()).some(Boolean);
  }
  ngOnInit(){this.load();this.loadCatalog();}
  loadCatalog(){this.admin.getCatalogCategories().subscribe(categories=>{this.catalogCategories.set(categories.filter(item=>item.is_active));const restaurant=categories.find(item=>item.slug==='restaurant'&&item.is_active);if(!this.newRestaurant.business_category_id)this.newRestaurant.business_category_id=restaurant?.id||categories[0]?.id||null;});}
  load(){this.admin.getRestaurants().subscribe(v=>this.restaurants.set(v));}
  impersonate(r:AdminRestaurantRow){
    if(!confirm(`Open the hotel dashboard as "${r.name}"?`))return;
    this.error.set('');
    this.impersonatingId.set(r.id);
    this.admin.impersonateRestaurant(r.id).subscribe({
      next:session=>{
        this.impersonatingId.set(null);
        const hotelUrl = `https://hotel.lalganjeats.com/auth/hotel-login?impersonate_token=${encodeURIComponent(session.access_token)}`;
        window.open(hotelUrl, '_blank');
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
    if(this.newRestaurant.show_packing_charge && !(Number(this.newRestaurant.packing_charge)>0)){this.error.set('Enter a packing charge amount.');return}
    const slides = this.packedSlides(this.cardSlides);
    this.saving.set(true);
    this.admin.createRestaurant({
      ...this.newRestaurant,
      owner_phone: this.ownerPhone,
      phone: this.restaurantPhone || undefined,
      owner_username: this.newRestaurant.owner_username?.trim() || undefined,
      owner_password: this.newRestaurant.owner_password?.trim() || undefined,
      latitude: this.newRestaurant.latitude ?? null,
      longitude: this.newRestaurant.longitude ?? null,
      show_packing_charge: !!this.newRestaurant.show_packing_charge,
      packing_charge: this.newRestaurant.show_packing_charge ? Number(this.newRestaurant.packing_charge) : 0,
      card_slides: slides,
      list_banner_url: slides[0]?.image_url || '',
    }).subscribe({
      next:()=>{
        this.saving.set(false);
        this.success.set('Restaurant added successfully.');
        this.addRestaurantOpen.set(false);
        const categoryId=this.newRestaurant.business_category_id;
        this.newRestaurant={name:'',description:'',phone:'',address:'',city:'Lalganj',pincode:'',owner_phone:'',owner_name:'',owner_username:'',owner_password:'',latitude:null,longitude:null,logo_url:'',list_banner_url:'',card_slides:[],banner_url:'',banner_mobile_url:'',business_category_id:categoryId,is_approved:true,show_packing_charge:false,packing_charge:null,opening_time:'10:00',closing_time:'22:00'};
        this.restaurantPhone='';
        this.ownerPhone='';
        this.cardSlides=this.blankSlides();
        this.desktopHeroPreview.set(null);
        this.mobileHeroPreview.set(null);
        this.load();
      },
      error:e=>{this.saving.set(false);this.error.set(e.error?.detail||'Failed to add restaurant.')}
    });
  }
  selectCardSlide(event: Event, index: number, editing = false) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const setError = (v: string) => editing ? this.editError.set(v) : this.uploadError.set(v);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload JPG, PNG, or WebP only.');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(`Image must be ${MAX_IMAGE_UPLOAD_MB} MB or smaller.`);
      input.value = '';
      return;
    }
    const setUploading = (v: boolean) => {
      const target = editing ? this.editCardSlideUploading : this.cardSlideUploading;
      const next = [...target()];
      next[index] = v;
      target.set(next);
    };
    setUploading(true);
    this.admin.uploadBanner(file, 'list_banner').subscribe({
      next: r => {
        const slides = editing ? this.editCardSlides : this.cardSlides;
        slides[index] = { ...slides[index], image_url: r.url };
        setUploading(false);
        input.value = '';
      },
      error: e => {
        setUploading(false);
        setError(e.error?.detail || 'Failed to upload image.');
        input.value = '';
      },
    });
  }
  removeCardSlide(index: number, editing = false) {
    const slides = editing ? this.editCardSlides : this.cardSlides;
    slides[index] = { image_url: '', text: '' };
  }
  selectBanner(
    event: Event,
    slot: 'desktop' | 'mobile' = 'desktop',
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
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(`Image must be ${MAX_IMAGE_UPLOAD_MB} MB or smaller.`);
      input.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    const purpose = slot === 'desktop' ? 'menu_banner' : 'menu_banner_mobile';
    const setUploading = (v: boolean) => {
      if (editing) {
        if (slot === 'desktop') this.editDesktopHeroUploading.set(v);
        else this.editMobileHeroUploading.set(v);
      } else {
        if (slot === 'desktop') this.desktopHeroUploading.set(v);
        else this.mobileHeroUploading.set(v);
      }
    };
    const setPreview = (value: string | null) => {
      if (editing) {
        if (slot === 'desktop') this.editDesktopHeroPreview.set(value);
        else this.editMobileHeroPreview.set(value);
      } else {
        if (slot === 'desktop') this.desktopHeroPreview.set(value);
        else this.mobileHeroPreview.set(value);
      }
    };
    setPreview(url);
    setUploading(true);
    this.admin.uploadBanner(file, purpose).subscribe({
      next: r => {
        if (editing) {
          if (slot === 'desktop') this.editForm.banner_url = r.url;
          else this.editForm.banner_mobile_url = r.url;
        } else {
          if (slot === 'desktop') this.newRestaurant.banner_url = r.url;
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
      list_banner_url:r.list_banner_url??'',card_slides:r.card_slides??[],banner_url:r.banner_url??'',banner_mobile_url:r.banner_mobile_url??'',
      business_category_id:r.business_category_id??null,is_open:r.is_open,is_approved:r.is_approved,is_active:r.is_active,
      owner_name:r.owner??'',owner_phone:r.owner_phone??'',owner_username:r.owner_username??'',owner_password:'',
      has_password:!!r.has_password,restaurant_phone:(r.phone??'').replace(/\D/g,'').slice(-10),
      show_packing_charge:!!r.show_packing_charge,packing_charge:r.packing_charge??null,
      opening_time:r.opening_time||'10:00',closing_time:r.closing_time||'22:00'
    };
    this.editCardSlides = this.slidesFromRow(r.card_slides, r.list_banner_url);
    this.editDesktopHeroPreview.set(r.banner_url||null);
    this.editMobileHeroPreview.set(r.banner_mobile_url||null);
    this.editOpen.set(true);
  }
  closeEdit(){
    this.editOpen.set(false);this.editId=null;this.editError.set('');
    this.editDesktopHeroUploading.set(false);this.editMobileHeroUploading.set(false);
    this.editCardSlideUploading.set([false, false, false, false, false]);
  }
  editPhone(v:string){this.editForm.restaurant_phone=v.replace(/\D/g,'').slice(0,10);}
  saveEdit(){
    if(!this.editId)return;this.editError.set('');
    if(!this.editForm.name?.trim()){this.editError.set('Restaurant name is required.');return}
    const phone=this.editForm.restaurant_phone||'';if(phone&&phone.length!==10){this.editError.set('Restaurant phone must be exactly 10 digits.');return}
    if(this.editForm.show_packing_charge && !(Number(this.editForm.packing_charge)>0)){this.editError.set('Enter a packing charge amount.');return}
    const slides = this.packedSlides(this.editCardSlides);
    const p:RestaurantUpdatePayload={name:this.editForm.name.trim(),description:this.editForm.description||null,phone:phone||null,address:this.editForm.address||null,city:this.editForm.city||'Lalganj',pincode:this.editForm.pincode||null,latitude:this.editForm.latitude!=null&&this.editForm.latitude!==('' as any)?Number(this.editForm.latitude):null,longitude:this.editForm.longitude!=null&&this.editForm.longitude!==('' as any)?Number(this.editForm.longitude):null,logo_url:this.editForm.logo_url||null,list_banner_url:slides[0]?.image_url||null,card_slides:slides,banner_url:this.editForm.banner_url||null,banner_mobile_url:this.editForm.banner_mobile_url||null,business_category_id:this.editForm.business_category_id??null,is_open:this.editForm.is_open,is_approved:this.editForm.is_approved,is_active:this.editForm.is_active,show_packing_charge:!!this.editForm.show_packing_charge,packing_charge:this.editForm.show_packing_charge?Number(this.editForm.packing_charge):0,opening_time:this.editForm.opening_time||null,closing_time:this.editForm.closing_time||null,owner_name:this.editForm.owner_name||null,owner_username:(this.editForm.owner_username||'').trim()||null,owner_password:(this.editForm.owner_password||'').trim()||null};
    this.editSaving.set(true);this.admin.updateRestaurant(this.editId,p).subscribe({next:()=>{this.editSaving.set(false);this.closeEdit();this.success.set('Restaurant updated.');this.load();},error:e=>{this.editSaving.set(false);this.editError.set(typeof e.error?.detail==='string'?e.error.detail:'Failed to update restaurant.')}});
  }
}
