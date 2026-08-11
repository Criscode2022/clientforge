import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="flex min-h-full items-center justify-center px-4 py-12">
      <div class="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div class="hidden lg:block">
          <div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            Production-ready freelancers OS
          </div>
          <h1 class="mt-5 font-display text-5xl font-semibold leading-tight tracking-tight">
            Run clients, projects & cashflow in one place.
          </h1>
          <p class="mt-4 max-w-md text-muted">
            ClientForge helps freelancers and agencies track relationships, ship work, and get paid — with a Neon-backed Nest API and a polished Angular UI.
          </p>
          <ul class="mt-8 space-y-3 text-sm text-muted">
            <li class="flex gap-2"><span class="text-primary">✓</span> Live KPIs & revenue analytics</li>
            <li class="flex gap-2"><span class="text-primary">✓</span> Invoice pipeline with line items & tax</li>
            <li class="flex gap-2"><span class="text-primary">✓</span> JWT auth, scoped multi-tenant data</li>
          </ul>
        </div>

        <div class="card p-6 sm:p-8">
          <div class="mb-6 flex items-center gap-3 lg:hidden">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-bg">CF</div>
            <div class="font-display text-xl font-semibold">ClientForge</div>
          </div>
          <h2 class="font-display text-2xl font-semibold">Welcome back</h2>
          <p class="mt-1 text-sm text-muted">Sign in to your workspace</p>

          <form class="mt-6 space-y-4" (ngSubmit)="submit()">
            <div>
              <label class="label" for="email">Email</label>
              <input id="email" class="input" type="email" [(ngModel)]="email" name="email" required autocomplete="email" />
            </div>
            <div>
              <label class="label" for="password">Password</label>
              <input id="password" class="input" type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" />
            </div>

            @if (error()) {
              <div class="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{{ error() }}</div>
            }

            <button class="btn-primary w-full" type="submit" [disabled]="loading()">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <div class="mt-4 rounded-xl border border-border bg-bg/40 p-3 text-xs text-muted">
            Demo: <span class="text-fg">demo&#64;clientforge.app</span> / <span class="text-fg">demo1234</span>
            <button type="button" class="ml-2 text-primary hover:underline" (click)="fillDemo()">Use demo</button>
          </div>

          <p class="mt-6 text-center text-sm text-muted">
            No account?
            <a routerLink="/register" class="font-semibold text-primary hover:underline">Create one</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  fillDemo() {
    this.email = 'demo@clientforge.app';
    this.password = 'demo1234';
  }

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl('/app');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Unable to sign in');
      },
    });
  }
}
