export interface PresetImage {
  title: string;
  url: string;
  category: string;
}

export const PRESET_CATEGORY_IMAGES = [
  {
    title: 'Golden Croissants & Pastries',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
    icon: '🥐'
  },
  {
    title: 'Gourmet Cakes & Pâtisserie',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
    icon: '🍰'
  },
  {
    title: 'French Macarons & Sweets',
    url: 'https://images.unsplash.com/photo-1569864321390-bf120ad636c0?auto=format&fit=crop&w=600&q=80',
    icon: '🧁'
  },
  {
    title: 'Savory Quiches & Pies',
    url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    icon: '🥪'
  },
  {
    title: 'Artisan Crusty Bread',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
    icon: '🥖'
  },
  {
    title: 'Espresso & Latte Art',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    icon: '☕'
  },
  {
    title: 'Hot Meals & Healthy Bowls',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    icon: '🍛'
  },
  {
    title: 'Fresh Fruit Juices & Smoothies',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    icon: '🍹'
  },
  {
    title: 'Artisan Pizza & Flatbreads',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    icon: '🍕'
  },
  {
    title: 'Burgers & Hot Sandwiches',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    icon: '🍔'
  }
];

export const PRESET_PRODUCT_IMAGES: PresetImage[] = [
  // Pastries
  { title: 'French Butter Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80', category: 'Pastries' },
  { title: 'Pain au Chocolat', url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=500&q=80', category: 'Pastries' },
  { title: 'Almond Frangipane Croissant', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category: 'Pastries' },
  { title: 'Berry Cruffin', url: 'https://images.unsplash.com/photo-1621236378699-8597fee6a1ce?auto=format&fit=crop&w=500&q=80', category: 'Pastries' },
  { title: 'Cinnamon Brioche Swirl', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category: 'Pastries' },

  // Cakes
  { title: 'Opera Gateau Slice', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },
  { title: 'Strawberry Fraisier Tart', url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },
  { title: 'Basque Burnt Cheesecake', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },
  { title: 'Dark Chocolate Ganache', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },
  { title: 'Lemon Meringue Tartlet', url: 'https://images.unsplash.com/photo-1519869325930-281384150729?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },
  { title: 'Red Velvet Slice', url: 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=500&q=80', category: 'Cakes' },

  // Macarons & Sweets
  { title: 'Assorted Macaron Box', url: 'https://images.unsplash.com/photo-1569864321390-bf120ad636c0?auto=format&fit=crop&w=500&q=80', category: 'Macarons' },
  { title: 'Vanilla Bean Eclair', url: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?auto=format&fit=crop&w=500&q=80', category: 'Macarons' },

  // Savory & Quiches
  { title: 'Quiche Lorraine', url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=500&q=80', category: 'Savory' },
  { title: 'Mushroom Truffle Tart', url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=500&q=80', category: 'Savory' },
  { title: 'Smoked Ham Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=500&q=80', category: 'Savory' },

  // Bread
  { title: 'Sourdough Country Boule', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category: 'Bread' },
  { title: 'French Baguette Tradition', url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=500&q=80', category: 'Bread' },
  { title: 'Brioche Loaf', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80', category: 'Bread' },

  // Drinks
  { title: 'Velvety Flat White / Latte', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=500&q=80', category: 'Drinks' },
  { title: 'Uji Matcha Green Tea Latte', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80', category: 'Drinks' },
  { title: 'Parisian Hot Chocolate', url: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=500&q=80', category: 'Drinks' },
  { title: 'Iced Americano', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80', category: 'Drinks' },
  { title: 'Fresh Passion Fruit Soda', url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=500&q=80', category: 'Drinks' },

  // Meals
  { title: 'Avocado Toast & Poached Egg', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=80', category: 'Meals' },
  { title: 'Club Sandwich Supreme', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', category: 'Meals' },
  { title: 'Artisan Rice & Curry Bowl', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', category: 'Meals' }
];

