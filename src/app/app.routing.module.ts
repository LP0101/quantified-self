import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppAuthGuard } from './authentication/app.auth.guard';

const routes: Routes = [
  {
    path: 'services',
    loadChildren: () => import('./modules/services.module').then(module => module.ServicesModule),
    data: {title: 'Services', animation: 'Services'}
  },
  {
    path: '',
    loadChildren: () => import('./modules/home.module').then(module => module.HomeModule),
    data: {title: 'Home', animation: 'Home'}
  },
  {
    path: 'login',
    loadChildren: () => import('./modules/login.module').then(module => module.LoginModule),
    data: {title: 'Login', animation: 'Login'},
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./modules/dashboard.module').then(module => module.DashboardModule),
    data: {title: 'Dashboard', animation: 'Dashboard'},
    canLoad: [AppAuthGuard]
  },
  {
    path: 'mytracks',
    loadChildren: () => import('./modules/my-tracks.module').then(module => module.MyTracksModule),
    data: {title: 'MyTracks', animation: 'MyTracks'},
    canLoad: [AppAuthGuard]
  },
  {
    path: 'coaching',
    loadChildren: () => import('./modules/coaching.module').then(module => module.CoachingModule),
    data: {title: 'Coaching', animation: 'Coaching'},
    canLoad: [AppAuthGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./modules/user.module').then(module => module.UserModule),
    data: {title: 'Settings', animation: 'User'},
    canLoad: [AppAuthGuard],
  },
  {
    path: 'user/:userID/dashboard',
    loadChildren: () => import('./modules/dashboard.module').then(module => module.DashboardModule),
    data: {title: `Athlete Dashboard`, animation: 'Dashboard'}
  },
  {
    path: 'user/:userID/event/:eventID',
    loadChildren: () => import('./modules/event.module').then(module => module.EventModule),
    data: {title: 'Event Details', animation: 'Event'}
  },
  {
    path: 'policies',
    loadChildren: () => import('./modules/policies.module').then(module => module.PoliciesModule),
    data: {title: 'Policies', animation: 'Policies'}
  },
  {path: '**', redirectTo: '/', pathMatch: 'full'},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled', relativeLinkResolution: 'legacy' })],
  exports: [RouterModule],
})

export class AppRoutingModule {
}
