import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom, filter } from 'rxjs';
import { WalletService } from '../services/wallet.service';

// we cannot await signal(are synchronous) values inside an async function,
// so this helper is used to wait for wallet readiness before accessing its state
export async function waitForWallet(): Promise<WalletService> {
  const walletService = inject(WalletService);
  if (!walletService.isReady()) {
    await firstValueFrom(
      // Wait for the wallet service to signal that it's ready before proceeding
      toObservable(walletService.isReady).pipe(filter(ready => ready))
    );
  }
  return walletService;
}
