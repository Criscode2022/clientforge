import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center px-4 py-12">
      <div class="card w-full max-w-md p-6 sm:p-8">
        <div class="mb-6 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-bg">CF</div>
          <div class="font-display text-xl font-semibold">ClientForge</div>
        </div>
        <h1 class="font-display text-2xl font-semibold">Create your workspace</h1>
        <p class="mt-1 text-sm text-muted">Start tracking clients and invoices in minutes.</p>

        <form class="mt-6 space-y-4" (ngSubmit)="submit()">
          <div>
            <label class="label" for="name">Full name</label>
            <input id="name" class="input" [(ngModel)]="name" name="name" required />
          </div>
          <div>
            <label class="label" for="company">Company (optional)</label>
            <input id="company" class="input" [(ngModel)]="company" name="company" />
          </div>
          <div>
            <label class="label" for="email">Email</label>
            <input id="email" class="input" type="email" [(ngModel)]="email" name="email" required />
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <input id="password" class="input" type="password" [(ngModel)]="password" name="password" required minlength="8" />
          </div>

          @if (error()) {
            <div class="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{{ error() }}</div>
          }

          <button class="btn-primary w-full" type="submit" [disabled]="loading()">
            {{ loading() ? 'Creating…' : 'Create account' }}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-muted">
          Already have an account?
          <a routerLink="/login" class="font-semibold text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  name = '';
  company = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth
      .register({
        name: this.name,
        company: this.company || undefined,
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          void this.router.navigateByUrl('/app');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Unable to register');
        },
      });
  }
}
