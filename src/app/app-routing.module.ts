import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DashboardComponent} from './components/dashboard/dashboard.component';
import {HomeComponent} from './components/home/home.component';
import {EventCardComponent} from './components/cards/event/event.card.component';
import {AppAuthGuard} from './authentication/app.auth.guard';
import {LoginComponent} from './components/login/login.component';
import {UserComponent} from './components/user/user.component';
import {ServicesComponent} from './components/services/services.component';

const routes: Routes = [
  {path: 'home', component: HomeComponent, data: {title: 'Home', animation: 'Home'}},
  {path: 'services', loadChildren: () => import('./modules/services.module').then(module => module.ServicesModule), data: {title: 'Services', animation: 'Services'}},
  // {path: '', redirectTo: 'home', pathMatch: 'full'},
  {path: 'login', loadChildren: () => import('./modules/login.module').then(module => module.LoginModule), data: {title: 'Login', animation: 'Login'}},
  {path: 'dashboard', loadChildren: () => import('./modules/dashboard.module').then(module => module.DashboardModule ), data: {title: 'Dashboard', animation: 'Dashboard'}, canActivate: [AppAuthGuard]},
  {path: 'user/:userID/event/:eventID', component: EventCardComponent, data: {title: 'Event Details', animation: 'Event'}},
  {path: 'user/:userID', loadChildren: () => import('./modules/user.module').then(module => module.UserModule), data: {title: 'Profile', animation: 'User'}},
  {path: '**', redirectTo: 'home', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})

export class AppRoutingModule {
}
