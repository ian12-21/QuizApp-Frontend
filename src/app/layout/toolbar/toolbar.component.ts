import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WalletService } from '../../../core/services/wallet.service';

@Component({
  selector: 'app-toolbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly walletService = inject(WalletService);

  protected readonly networkName = computed(() => {
    const chainId = this.walletService.chainId();
    if (!chainId) return null;

    const networks: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      80002: 'Amoy',
      11155111: 'Sepolia',
    };
    return networks[chainId] ?? `Chain ${chainId}`;
  });

  protected readonly avatarColor = computed(() => {
    const address = this.walletService.address();
    if (!address) return '#6b46c1';
    return `#${address.slice(-6)}`;
  });

  protected readonly avatarInitial = computed(() => {
    const profile = this.authService.userProfile();
    if (profile?.nickname) {
      return profile.nickname.charAt(0).toUpperCase();
    }
    const address = this.walletService.address();
    return address ? address.slice(2, 3).toUpperCase() : '?';
  });

  logout(): void {
    this.authService.logout();
  }
}
