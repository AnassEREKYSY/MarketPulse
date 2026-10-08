import { Page, Route } from '@playwright/test';

export const API = 'http://localhost:8080/api';
export interface Call { path: string; search: URLSearchParams; }

const summary = { mean: 55000, p10: 38000, p25: 47000, median: 55000, p75: 64000, p90: 72000 };
const histogram = [{ from: 30000, to: 40000, count: 300 }, { from: 40000, to: 50000, count: 500 }, { from: 50000, to: 60000, count: 900 }, { from: 60000, to: null, count: 400 }];
const job = (i: number, extra: object = {}) => ({
  id: `j${i}`, title: `Senior .NET Developer ${i}`, company: `Company ${i}`, location: 'Paris, Île-de-France', region: 'Île-de-France',
  latitude: 48.85, longitude: 2.35, created: new Date().toISOString(), url: `https://example.com/job/${i}`,
  salaryMin: 50000, salaryMax: 60000, salaryIsEstimate: false, contract: 'Permanent', time: 'FullTime', category: 'IT Jobs',
  snippet: 'Remote friendly team.', workMode: i % 2 ? 'Remote' : 'Onsite', seniority: 'Senior', ...extra,
});
export const countries = [
  { code: 'fr', name: 'France', currency: 'EUR', eurRate: 1 }, { code: 'gb', name: 'United Kingdom', currency: 'GBP', eurRate: 1.17 },
  { code: 'us', name: 'United States', currency: 'USD', eurRate: 0.88 }, { code: 'de', name: 'Germany', currency: 'EUR', eurRate: 1 },
];
const scope = (s: URLSearchParams) => ({ country: s.get('country') ?? 'fr', what: s.get('what'), where: s.get('where') });

/** Answers every /api call with fixtures; `overrides` win (key: path). Returns the call log. */
export async function mockApi(page: Page, overrides: Record<string, (r: Route, c: Call) => unknown> = {}) {
  const calls: Call[] = [];
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
  await page.route(`${API}/**`, async route => {
    const url = new URL(route.request().url());
    const c: Call = { path: url.pathname.replace(/^\/api/, ''), search: url.searchParams };
    calls.push(c);
    // An override can return false to fall back to the default fixture.
    if (overrides[c.path] && (await overrides[c.path](route, c)) !== false) return;
    const json = (body: unknown) => route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
    const s = scope(c.search);
    switch (c.path) {
      case '/countries': return json(countries);
      case '/categories': return json([{ tag: 'it-jobs', label: 'IT Jobs' }]);
      case '/overview': return json({
        ...s, currency: s.country === 'gb' ? 'GBP' : 'EUR', totalJobs: s.what === 'nothing' ? 0 : 2992, salary: summary, histogram,
        remotePercent: 34, hybridPercent: 16, salaryAdvertisedPercent: 48, sampleSize: 50,
        contracts: [{ name: 'Permanent', count: 36, percent: 72 }], times: [{ name: 'Full time', count: 44, percent: 88 }], seniority: [{ name: 'Senior', count: 19, percent: 38 }],
        regions: [{ name: 'Île-de-France', count: 404 }], companies: [{ name: 'Thales', count: 86, averageSalary: 55500 }], newThisWeek: 691, latest: [job(1), job(2)],
      });
      case '/jobs': {
        const page = Number(c.search.get('page') ?? 1);
        return json({ total: 45, page, pageSize: 20, pages: 3, currency: 'EUR', jobs: Array.from({ length: page === 3 ? 5 : 20 }, (_, i) => job((page - 1) * 20 + i)) });
      }
      case '/compare': return json({
        country: s.country, currency: 'EUR', where: null,
        items: c.search.getAll('q').map((q, i) => ({ query: q, totalJobs: 3000 - i * 700, salary: { ...summary, median: 55000 - i * 1000 }, remotePercent: 30 + i, hybridPercent: 15, seniority: [], topRegion: 'Île-de-France', topCompany: 'Thales' })),
      });
      case '/salaries': return json({
        ...s, currency: 'EUR', summary, histogram, categoryLabel: 'IT Jobs',
        history: Array.from({ length: 12 }, (_, i) => ({ month: `2026-${String(i + 1).padStart(2, '0')}`, value: 45000 + i * 400 })),
        bySeniority: [{ name: 'Junior', median: 38000, jobs: 12 }, { name: 'Senior', median: 62000, jobs: 30 }], byRegion: [{ name: 'Île-de-France', median: 58000, jobs: 20 }],
        topPayingCompanies: [{ name: 'Datadog', count: 5, averageSalary: 70000 }], sampleWithSalary: 80,
      });
      case '/countries/compare': return json({
        what: s.what, ratesAsOf: '2026-09',
        items: (c.search.get('codes') ?? '').split(',').map((code, i) => ({ code, name: countries.find(x => x.code === code)?.name ?? code, currency: 'EUR', totalJobs: 1000 + i * 500, meanSalary: 50000, meanSalaryEur: 50000 + i * 5000, medianSalary: 50000, medianSalaryEur: 50000 + i * 5000, remotePercent: 30, topRegion: 'Capital' })),
      });
      case '/map': return json({ ...s, currency: 'EUR', totalJobs: 2903, sampled: 100, points: [{ name: 'Paris', latitude: 48.85, longitude: 2.35, count: 40, medianSalary: 58000 }], regions: [{ name: 'Île-de-France', count: 400 }] });
    }
    return route.fulfill({ status: 404, json: { error: 'Not found' } });
  });
  // Map tiles are not needed in tests.
  await page.route('https://*.basemaps.cartocdn.com/**', r => r.abort());
  return calls;
}
