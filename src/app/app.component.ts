import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
    selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {

  currentUrl: string = '';
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private router: Router
  ) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentUrl = event.url;
    });
  }


  async ngOnInit(){
    
  }

}
