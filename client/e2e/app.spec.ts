import { expect, test } from '@playwright/test';
import { mockApi } from './mock-api';

test('overview shows the market for the default search', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('developer');
  const kpis = page.getByTestId('kpis');
  await expect(kpis).toContainText('2,992');
  await expect(kpis).toContainText('€55K');
  await expect(kpis).toContainText('34%');
  await expect(page.getByText('Thales')).toBeVisible();
  expect(calls.find(c => c.path === '/overview')!.search.get('country')).toBe('fr');
});

test('the search bar changes skill, location and country and keeps them in the URL', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/');
  await page.getByTestId('what').fill('.NET');
  await page.getByTestId('where').fill('Lyon');
  await page.getByTestId('go').click();
  await expect(page).toHaveURL(/q=.NET/);
  await expect(page).toHaveURL(/l=Lyon/);
  await page.getByTestId('country').selectOption('gb');
  await expect(page).toHaveURL(/c=gb/);
  await expect.poll(() => calls.some(c => c.path === '/overview' && c.search.get('country') === 'gb' && c.search.get('what') === '.NET' && c.search.get('where') === 'Lyon')).toBe(true);

  // Moving to another screen keeps the search.
  await page.getByRole('navigation', { name: 'Sections' }).first().getByRole('link', { name: 'Salary explorer' }).click();
  await expect(page).toHaveURL(/\/salaries\?.*q=.NET/);
});

test('an empty market says so', async ({ page }) => {
  await mockApi(page);
  await page.goto('/?q=nothing');
  await expect(page.getByText('No ads match this search')).toBeVisible();
});

test('provider errors are shown with a retry', async ({ page }) => {
  let fail = true;
  await mockApi(page, {
    '/overview': r => (fail ? r.fulfill({ status: 429, json: { error: "Today's job data allowance is used up." }, headers: { 'access-control-allow-origin': '*' } }) : false),
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('allowance is used up');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('kpis')).toContainText('2,992');
});

test('jobs filters and pagination go to the API', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/jobs?q=react');
  await expect(page.getByTestId('results').getByRole('article')).toHaveCount(20);
  await page.getByTestId('f-mode').selectOption('remote');
  await page.getByTestId('f-sort').selectOption('date');
  await expect(page).toHaveURL(/workMode=remote/);
  await expect.poll(() => calls.some(c => c.path === '/jobs' && c.search.get('workMode') === 'remote' && c.search.get('sort') === 'date')).toBe(true);
  await page.getByTestId('next').click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText('page 2 of 3')).toBeVisible();
  // Each ad links to the source.
  await expect(page.getByRole('link', { name: /Senior \.NET Developer 20/ })).toHaveAttribute('href', 'https://example.com/job/20');
});

test('compare skills sends each skill and lists them', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/compare?skills=React,Angular');
  await expect(page.getByTestId('compare-table')).toContainText('React');
  await page.getByTestId('add-skill').fill('Vue');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/skills=React,Angular,Vue/);
  await expect(page.getByTestId('compare-table').locator('tbody tr')).toHaveCount(3);
  await expect.poll(() => calls.filter(c => c.path === '/compare').at(-1)?.search.getAll('q')).toEqual(['React', 'Angular', 'Vue']);
  await page.getByRole('button', { name: 'Remove React' }).click();
  await page.getByRole('button', { name: 'Remove Angular' }).click();
  await expect(page.getByText('Add at least two skills')).toBeVisible();
});

test('salary explorer shows percentiles, history and groups', async ({ page }) => {
  await mockApi(page);
  await page.goto('/salaries?q=go');
  await expect(page.getByTestId('percentiles')).toContainText('€47K');
  await expect(page.getByText('Average advertised salary in IT Jobs')).toBeVisible();
  await page.getByRole('button', { name: 'Table' }).nth(1).click();
  await expect(page.getByRole('cell', { name: '€49,400' })).toBeVisible();
  await expect(page.getByText('Datadog')).toBeVisible();
});

test('countries can be toggled and are compared in euros', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/countries?q=python&countries=fr,gb');
  await expect(page.getByTestId('countries-table').locator('tbody tr')).toHaveCount(2);
  await page.getByTestId('country-de').click();
  await expect(page).toHaveURL(/countries=fr,gb,de/);
  await expect.poll(() => calls.filter(c => c.path === '/countries/compare').at(-1)?.search.get('codes')).toBe('fr,gb,de');
  await expect(page.getByTestId('countries-table')).toContainText('Germany');
});

test('map draws job locations and regions', async ({ page }) => {
  await mockApi(page);
  await page.goto('/map?q=go');
  await expect(page.locator('.leaflet-interactive')).toHaveCount(1);
  await expect(page.getByText('2,903 open jobs in total')).toBeVisible();
});

test('old URLs and unknown pages', async ({ page }) => {
  await mockApi(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/$|\/\?/);
  await page.goto('/nowhere');
  await expect(page.getByText('This page does not exist')).toBeVisible();
});
