// 17 real-based pollution incidents from Greek news (2022-2025).
// Used as static fallback when Supabase is not configured,
// so the map and tracking pages work on first deploy.

export type SeedReport = {
  public_token: string
  image_url: string
  lat: number
  lng: number
  category: string
  status: string
  created_at: string
  municipality: { name_el: string } | null
}

export const SEED_REPORTS: SeedReport[] = [
  {
    public_token: 'ab12cd34ef56',
    image_url: 'https://picsum.photos/seed/10/800/600',
    lat: 40.6480, lng: 22.9050,
    category: 'illegal_dump', status: 'in_review',
    created_at: '2023-08-14T09:22:00+03:00',
    municipality: { name_el: 'Δήμος Θεσσαλονίκης' },
  },
  {
    public_token: '12ab34cd56ef',
    image_url: 'https://picsum.photos/seed/20/800/600',
    lat: 40.5748, lng: 22.9642,
    category: 'illegal_dump', status: 'forwarded',
    created_at: '2023-11-22T14:05:00+03:00',
    municipality: { name_el: 'Δήμος Καλαμαριάς' },
  },
  {
    public_token: 'deadbeef1234',
    image_url: 'https://picsum.photos/seed/30/800/600',
    lat: 40.5395, lng: 23.0249,
    category: 'illegal_dump', status: 'forwarded',
    created_at: '2024-01-09T11:47:00+03:00',
    municipality: { name_el: 'Δήμος Θέρμης' },
  },
  {
    public_token: 'cafe1234abcd',
    image_url: 'https://picsum.photos/seed/40/800/600',
    lat: 38.0713, lng: 23.4994,
    category: 'illegal_dump', status: 'resolved',
    created_at: '2022-06-30T08:15:00+03:00',
    municipality: { name_el: 'Δήμος Μάνδρας-Ειδυλλίας' },
  },
  {
    public_token: 'face987bcd12',
    image_url: 'https://picsum.photos/seed/50/800/600',
    lat: 35.3490, lng: 25.2231,
    category: 'illegal_dump', status: 'in_review',
    created_at: '2023-03-15T16:30:00+03:00',
    municipality: { name_el: 'Δήμος Ηρακλείου' },
  },
  {
    public_token: '1234567890ab',
    image_url: 'https://picsum.photos/seed/60/800/600',
    lat: 38.4631, lng: 23.6034,
    category: 'illegal_dump', status: 'in_review',
    created_at: '2024-04-08T10:00:00+03:00',
    municipality: { name_el: 'Δήμος Χαλκιδέων' },
  },
  {
    public_token: 'abcdef012345',
    image_url: 'https://picsum.photos/seed/70/800/600',
    lat: 37.7697, lng: 23.9071,
    category: 'illegal_dump', status: 'forwarded',
    created_at: '2022-09-20T13:55:00+03:00',
    municipality: { name_el: 'Δήμος Σαρωνικού' },
  },
  {
    public_token: '543210fedcba',
    image_url: 'https://picsum.photos/seed/80/800/600',
    lat: 36.7271, lng: 24.4350,
    category: 'illegal_dump', status: 'resolved',
    created_at: '2023-07-12T07:40:00+03:00',
    municipality: { name_el: 'Δήμος Μήλου' },
  },
  {
    public_token: 'a1b2c3d4e5f0',
    image_url: 'https://picsum.photos/seed/90/800/600',
    lat: 37.4467, lng: 25.3289,
    category: 'roadside_litter', status: 'in_review',
    created_at: '2023-08-05T18:20:00+03:00',
    municipality: { name_el: 'Δήμος Μυκονίων' },
  },
  {
    public_token: '0f1e2d3c4b5a',
    image_url: 'https://picsum.photos/seed/100/800/600',
    lat: 36.3932, lng: 25.4615,
    category: 'roadside_litter', status: 'forwarded',
    created_at: '2023-07-05T17:05:00+03:00',
    municipality: { name_el: 'Δήμος Θήρας' },
  },
  {
    public_token: '123456abcdef',
    image_url: 'https://picsum.photos/seed/110/800/600',
    lat: 36.4341, lng: 28.2176,
    category: 'illegal_dump', status: 'pending',
    created_at: '2024-06-20T12:10:00+03:00',
    municipality: { name_el: 'Δήμος Ρόδου' },
  },
  {
    public_token: 'fedcba654321',
    image_url: 'https://picsum.photos/seed/120/800/600',
    lat: 39.6243, lng: 19.9217,
    category: 'roadside_litter', status: 'resolved',
    created_at: '2022-08-11T09:00:00+03:00',
    municipality: { name_el: 'Δήμος Κερκυραίων' },
  },
  {
    public_token: 'a0b1c2d3e4f5',
    image_url: 'https://picsum.photos/seed/130/800/600',
    lat: 38.0209, lng: 23.7982,
    category: 'abandoned_vehicle', status: 'resolved',
    created_at: '2024-02-14T11:30:00+03:00',
    municipality: { name_el: 'Δήμος Χαλανδρίου' },
  },
  {
    public_token: 'f5e4d3c2b1a0',
    image_url: 'https://picsum.photos/seed/140/800/600',
    lat: 37.9453, lng: 23.6462,
    category: 'abandoned_vehicle', status: 'resolved',
    created_at: '2022-12-05T10:45:00+03:00',
    municipality: { name_el: 'Δήμος Πειραιά' },
  },
  {
    public_token: '9876543210ab',
    image_url: 'https://picsum.photos/seed/150/800/600',
    lat: 40.6200, lng: 22.9600,
    category: 'abandoned_vehicle', status: 'forwarded',
    created_at: '2024-03-18T15:20:00+03:00',
    municipality: { name_el: 'Δήμος Θεσσαλονίκης' },
  },
  {
    public_token: 'ab9876543210',
    image_url: 'https://picsum.photos/seed/160/800/600',
    lat: 37.9701, lng: 23.6441,
    category: 'abandoned_vehicle', status: 'in_review',
    created_at: '2023-10-03T08:55:00+03:00',
    municipality: { name_el: 'Δήμος Νίκαιας-Αγ.Ι. Ρέντη' },
  },
  {
    public_token: 'cc44dd55ee66',
    image_url: 'https://picsum.photos/seed/170/800/600',
    lat: 39.3640, lng: 22.9430,
    category: 'illegal_dump', status: 'pending',
    created_at: '2023-12-07T14:00:00+03:00',
    municipality: { name_el: 'Δήμος Βόλου' },
  },
]
