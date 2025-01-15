import { Routes } from '@angular/router';
import { WelcomePageComponent } from './welcome-page-component/welcome-page-component.component';

export const routes: Routes = [
  { path: '', component: WelcomePageComponent },
];


//example
/*
export const routes: Routes = [
  { path: '', component: ListingComponent },
  { path: 'artists/:artist/albums/:album/:address', component: AlbumComponent },
  { path: 'terms-and-conditions', component: TandcComponent },
  { path: 'privacy-policy', component: PpolicyComponent },
  { path: 'how-it-works', component: ManualComponent },
  { path: 'about', component: AboutComponent },
  { path: 'explore', component: ExplorePageComponent },
  { path: 'user', component: UserPageComponent },
  { path: 'account-details/:address/listing/:artist', component: AccountDetailsComponent },
  { path: 'user/account-details/listing/:address', component: AccountDetailsComponent },
  { path: 'account-details/:address/listing/:author', component: AccountDetailsComponent},
  { path: 'docs', component: DocumentationPageComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'faq', component: FaqComponent }
];
*/ 