import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `
    <div class="min-h-full lg:flex">
      <!-- Mobile top bar -->
      <header class="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <div class="flex items-center gap-2">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-bg">CF</div>
          <span class="font-display text-lg font-semibold">ClientForge</span>
        </div>
        <button type="button" class="btn-ghost px-3" (click)="mobileOpen.set(!mobileOpen())" aria-label="Toggle menu">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </header>

      <!-- Sidebar -->
      <aside
        [ngClass]="mobileOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
        class="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-surface/95 p-4 backdrop-blur transition-transform lg:static lg:translate-x-0"
      >
        <div class="mb-8 hidden items-center gap-3 px-2 lg:flex">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-bg shadow-[0_0_24px_rgba(20,184,166,0.35)]">CF</div>
          <div>
            <div class="font-display text-xl font-semibold leading-none">ClientForge</div>
            <div class="mt-1 text-xs text-muted">Client & invoice OS</div>
          </div>
        </div>

        <nav class="flex flex-1 flex-col gap-1">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-soft text-primary"
              (click)="mobileOpen.set(false)"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition hover:bg-elevated hover:text-fg"
            >
              <span class="text-base opacity-80" [innerHTML]="item.icon"></span>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-4 rounded-2xl border border-border bg-elevated/50 p-3">
          <div class="text-sm font-semibold">{{ auth.user()?.name }}</div>
          <div class="truncate text-xs text-muted">{{ auth.user()?.email }}</div>
          <button type="button" class="btn-ghost mt-3 w-full justify-start px-2 text-sm" (click)="auth.logout()">
            Sign out
          </button>
        </div>
      </aside>

      @if (mobileOpen()) {
        <div class="fixed inset-0 z-30 bg-black/50 lg:hidden" (click)="mobileOpen.set(false)"></div>
      }

      <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div class="mx-auto max-w-7xl">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly mobileOpen = signal(false);

  readonly nav = [
    {
      path: '/app',
      label: 'Dashboard',
      icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>`,
    },
    {
      path: '/app/clients',
      label: 'Clients',
      icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
    },
    {
      path: '/app/projects',
      label: 'Projects',
      icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`,
    },
    {
      path: '/app/invoices',
      label: 'Invoices',
      icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    },
    {
      path: '/app/expenses',
      label: 'Expenses',
      icon: `<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    },
  ];
}
