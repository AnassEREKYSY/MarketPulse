import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api.service';
import { errorText } from '../core/format';
import { MarketState } from '../core/market-state';
import { AskSource } from '../core/models';
import { IconComponent } from '../shared/icon.component';

interface Turn { role: 'user' | 'assistant'; text: string; sources?: AskSource[]; }
type Segment = { text: string; bold: boolean };
type Line = { bullet: boolean; segments: Segment[] };

/** "- item" lines become bullets and **text** becomes bold. Everything else is plain text (no HTML). */
function lines(text: string): Line[] {
  return text.split('\n').filter(l => l.trim()).map(raw => {
    const bullet = /^\s*[-•*]\s+/.test(raw);
    const body = bullet ? raw.replace(/^\s*[-•*]\s+/, '') : raw;
    const segments = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
      .map(s => (s.startsWith('**') && s.endsWith('**') ? { text: s.slice(2, -2), bold: true } : { text: s, bold: false }));
    return { bullet, segments };
  });
}

@Component({
  selector: 'app-ask',
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page flex min-h-[calc(100dvh-140px)] flex-col py-6 lg:min-h-[calc(100dvh-57px)]">
      <p class="text-2xs font-medium uppercase tracking-[0.1em] text-accent">Ask the market</p>
      <h1 class="h1 mt-1">Ask anything about jobs, skills and salaries</h1>
      <p class="mt-1 max-w-2xl text-[13px] text-ink-muted">
        Answers come from live job ads, through the same data as the other screens. Each answer links to the screens it used.
      </p>

      <div class="mt-5 flex flex-1 flex-col gap-3" aria-live="polite" data-testid="conversation">
        @if (!turns().length) {
          <div class="panel p-4">
            <p class="text-2xs font-medium uppercase tracking-[0.08em] text-ink-faint">Try</p>
            <div class="mt-3 flex flex-wrap gap-2">
              @for (s of suggestions(); track s) {
                <button type="button" class="chip h-auto py-1.5 text-left" (click)="send(s)" data-testid="suggestion">{{ s }}</button>
              }
            </div>
          </div>
        }

        @for (t of turns(); track $index) {
          @if (t.role === 'user') {
            <div class="ml-auto max-w-[85%] rounded-card rounded-br-md bg-accent/15 px-4 py-2.5 text-[14px] text-ink">{{ t.text }}</div>
          } @else {
            <div class="panel max-w-[92%] px-4 py-3 text-[14px] leading-relaxed text-ink" data-testid="answer">
              <div class="space-y-1.5">
                @for (l of render(t.text); track $index) {
                  <p [class]="l.bullet ? 'relative pl-4 before:absolute before:left-0 before:top-[0.6em] before:h-1 before:w-1 before:rounded-full before:bg-accent' : ''">
                    @for (s of l.segments; track $index) { @if (s.bold) { <strong class="num font-semibold text-ink">{{ s.text }}</strong> } @else { {{ s.text }} } }
                  </p>
                }
              </div>
              @if (t.sources?.length) {
                <div class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line/[0.06] pt-3">
                  <span class="text-2xs text-ink-faint">Open:</span>
                  @for (s of t.sources; track $index) {
                    <a class="chip h-6 px-2 text-2xs" [routerLink]="s.path" [queryParams]="s.query">{{ s.label }} <app-icon name="arrow-right" [size]="11" /></a>
                  }
                </div>
              }
            </div>
          }
        }

        @if (busy()) {
          <div class="flex items-center gap-2 text-[13px] text-ink-muted" data-testid="thinking">
            <span class="inline-flex gap-1"><span class="dot"></span><span class="dot [animation-delay:150ms]"></span><span class="dot [animation-delay:300ms]"></span></span>
            Reading the job market…
          </div>
        }
        @if (error()) {
          <p class="rounded-md border border-down/30 bg-down/10 px-3 py-2 text-[13px] text-down" role="alert" data-testid="ask-error">{{ error() }}</p>
        }
        <div #end></div>
      </div>

      <form class="sticky bottom-0 mt-4 bg-bg pb-2 pt-2" (ngSubmit)="send(question())">
        <div class="flex items-end gap-2 rounded-card border border-line/[0.12] bg-surface p-2 focus-within:border-accent/60">
          <label for="ask-input" class="sr-only">Your question</label>
          <textarea id="ask-input" name="question" rows="1" maxlength="500" data-testid="ask-input"
            class="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
            placeholder="e.g. Is .NET or Java better paid in Germany?" [ngModel]="question()" (ngModelChange)="question.set($event)"
            (keydown.enter)="enter($event)"></textarea>
          <button type="submit" class="btn-primary h-9 shrink-0" [disabled]="busy() || !question().trim()" data-testid="ask-send">
            <span class="hidden sm:inline">Ask</span><app-icon name="arrow-right" [size]="15" class="sm:hidden" /><span class="sr-only sm:hidden">Ask</span>
          </button>
        </div>
        <div class="mt-1.5 flex items-center justify-between gap-3 text-2xs text-ink-faint">
          <span>AI answers from live ads. Check the linked screens for the full picture.</span>
          @if (turns().length) { <button type="button" class="hover:text-ink" (click)="reset()">New conversation</button> }
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dot { width: 6px; height: 6px; border-radius: 9999px; background: currentColor; opacity: .3; animation: blink 1.2s infinite ease-in-out; }
    @keyframes blink { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
  `],
})
export class AskPage {
  private api = inject(Api);
  state = inject(MarketState);
  private end = viewChild<ElementRef<HTMLElement>>('end');

  turns = signal<Turn[]>([]);
  question = signal('');
  busy = signal(false);
  error = signal<string | null>(null);

  suggestions = computed(() => {
    const what = this.state.scope().what || 'developer';
    const country = this.state.country()?.name ?? 'France';
    return [
      `How big is the ${what} market in ${country}, and what does it pay?`,
      `How many ${what} jobs are remote?`,
      'Compare .NET, Java and Node.js salaries',
      `Which pays a data engineer best: France, Germany or the UK?`,
      `Show me the latest ${what} ads`,
    ];
  });

  render = lines;

  enter(e: Event) {
    const k = e as KeyboardEvent;
    if (k.shiftKey) return;
    k.preventDefault();
    this.send(this.question());
  }

  send(text: string) {
    const q = text.trim();
    if (!q || this.busy()) return;
    const history = this.turns().slice(-6).map(t => ({ role: t.role, text: t.text }));
    const s = this.state.scope();
    this.turns.update(t => [...t, { role: 'user', text: q }]);
    this.question.set('');
    this.error.set(null);
    this.busy.set(true);
    this.scroll();
    this.api.ask({ question: q, history, country: s.country, what: s.what, where: s.where }).subscribe({
      next: r => {
        this.turns.update(t => [...t, { role: 'assistant', text: r.answer, sources: r.sources }]);
        this.busy.set(false);
        this.scroll();
      },
      error: e => {
        this.error.set(errorText(e, 'The assistant could not answer. Please try again.'));
        this.busy.set(false);
        this.scroll();
      },
    });
  }

  reset() { this.turns.set([]); this.error.set(null); }

  private scroll() { setTimeout(() => this.end()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50); }
}
