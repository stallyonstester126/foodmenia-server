/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Clear existing data in reverse order of foreign keys
  await knex("favorites").del();
  await knex("related_items").del();
  await knex("item_addon_options").del();
  await knex("item_addon_groups").del();
  await knex("menu_items").del();
  await knex("menu_categories").del();
  await knex("restaurant_cuisines").del();
  await knex("restaurants").del();
  await knex("cuisines").del();

  // 1. Seed Cuisines
  const [fastFoodId] = await knex("cuisines").insert({ name: "Fast Food", image_url: "/item1.png" });
  const [chineseId] = await knex("cuisines").insert({ name: "Chinese", image_url: "/item2.png" });
  const [italianId] = await knex("cuisines").insert({ name: "Italian", image_url: "/item3.png" });
  const [dessertsId] = await knex("cuisines").insert({ name: "Desserts", image_url: "/item1.png" });
  const [beveragesId] = await knex("cuisines").insert({ name: "Beverages", image_url: "/item2.png" });

  // 2. Seed Restaurants & Shops
  const [jollibeeId] = await knex("restaurants").insert({
    name: "Jollibee - Lucena GCT",
    type: "restaurant",
    cover_image_url: "/restaurant_jollibee.png",
    description: "Crispy Fried Chicken, Burger Steaks, and Sweet-style Jolly Spaghetti.",
    address: "Grand Central Terminal, Lucena City",
    rating: 4.80,
    rating_count: 2400,
    price_tier: "$$",
    delivery_time_min: 15,
    delivery_time_max: 30,
    is_active: true,
  });

  const [chowkingId] = await knex("restaurants").insert({
    name: "Chowking - Grand Terminal Lucena",
    type: "restaurant",
    cover_image_url: "/restaurant_chowking.png",
    description: "Chinese fast food, dim sum, fried rice platters, and noodles.",
    address: "Lucena Grand Central Terminal, Diversion Rd",
    rating: 4.60,
    rating_count: 1850,
    price_tier: "$$",
    delivery_time_min: 20,
    delivery_time_max: 35,
    is_active: true,
  });

  const [alBasitId] = await knex("restaurants").insert({
    name: "Al Basit Fast Food & BBQ",
    type: "restaurant",
    cover_image_url: "/restaurant_albasit.png",
    description: "Delicious Chicken Burgers, crispy nuggets, BBQ platters, and fries.",
    address: "Main Commercial Area, Block 4",
    rating: 4.70,
    rating_count: 1300,
    price_tier: "$",
    delivery_time_min: 20,
    delivery_time_max: 35,
    is_active: true,
  });

  const [sevenElevenId] = await knex("restaurants").insert({
    name: "Seven Eleven - 24/7 Mart & Snacks",
    type: "shop",
    cover_image_url: "/restaurant_seveneleven.png",
    description: "Fresh hot dogs, waffle fries, Big Gulp beverages, and quick bites.",
    address: "Corner St & High Ave",
    rating: 4.50,
    rating_count: 980,
    price_tier: "$",
    delivery_time_min: 10,
    delivery_time_max: 20,
    is_active: true,
  });

  // 3. Link Restaurant Cuisines
  await knex("restaurant_cuisines").insert([
    { restaurant_id: jollibeeId, cuisine_id: fastFoodId },
    { restaurant_id: chowkingId, cuisine_id: chineseId },
    { restaurant_id: chowkingId, cuisine_id: fastFoodId },
    { restaurant_id: alBasitId, cuisine_id: fastFoodId },
    { restaurant_id: sevenElevenId, cuisine_id: fastFoodId },
    { restaurant_id: sevenElevenId, cuisine_id: beveragesId },
  ]);

  // 4. Seed Menu Categories & Items for all restaurants
  // --- A. Al Basit ---
  const [catPopular] = await knex("menu_categories").insert({ restaurant_id: alBasitId, name: "Popular", sort_order: 1 });
  const [catStarters] = await knex("menu_categories").insert({ restaurant_id: alBasitId, name: "Starters & Fries", sort_order: 2 });
  const [catBBQ] = await knex("menu_categories").insert({ restaurant_id: alBasitId, name: "BBQ & Grills", sort_order: 3 });

  const [itemBurger] = await knex("menu_items").insert({
    restaurant_id: alBasitId,
    category_id: catPopular,
    name: "Crispy Zinger Crunch Burger",
    description: "Double fried crispy chicken thigh fillet with fresh iceberg lettuce and secret garlic sauce.",
    image_url: "/promo_chicken.png",
    base_price: 349.00,
    is_available: true,
    sort_order: 1,
  });

  const [itemFries] = await knex("menu_items").insert({
    restaurant_id: alBasitId,
    category_id: catStarters,
    name: "Loaded Curly Waffle Fries",
    description: "Seasoned crispy potato waffle fries with melted cheddar drizzle.",
    image_url: "/card1.jpg",
    base_price: 199.00,
    is_available: true,
    sort_order: 2,
  });

  const [itemNuggets] = await knex("menu_items").insert({
    restaurant_id: alBasitId,
    category_id: catStarters,
    name: "6-Piece Golden Chicken Nuggets",
    description: "Crispy bite-sized battered chicken with honey mustard dip.",
    image_url: "/card2.png",
    base_price: 249.00,
    is_available: true,
    sort_order: 3,
  });

  const [itemDrink] = await knex("menu_items").insert({
    restaurant_id: alBasitId,
    category_id: catPopular,
    name: "Ice Cold Coca-Cola Zero",
    description: "Chilled 500ml refreshing beverage.",
    image_url: "/card3.jpg",
    base_price: 99.00,
    is_available: true,
    sort_order: 4,
  });

  // Add-on groups for Al Basit Burger
  const [addonGroupCheese] = await knex("item_addon_groups").insert({
    menu_item_id: itemBurger,
    name: "Choose Extra Cheese Slice",
    selection_type: "single",
    is_required: false,
  });

  await knex("item_addon_options").insert([
    { addon_group_id: addonGroupCheese, name: "Add 1 Cheddar Slice", extra_price: 49.00 },
    { addon_group_id: addonGroupCheese, name: "Add Double Cheese", extra_price: 89.00 },
  ]);

  const [addonGroupSauce] = await knex("item_addon_groups").insert({
    menu_item_id: itemBurger,
    name: "Extra Dipping Sauces",
    selection_type: "multiple",
    is_required: false,
  });

  await knex("item_addon_options").insert([
    { addon_group_id: addonGroupSauce, name: "Chipotle Mayo Dip", extra_price: 35.00 },
    { addon_group_id: addonGroupSauce, name: "Smoky Honey Mustard", extra_price: 35.00 },
    { addon_group_id: addonGroupSauce, name: "Garlic Ranch Sauce", extra_price: 30.00 },
  ]);

  await knex("related_items").insert([
    { menu_item_id: itemBurger, related_item_id: itemFries, sort_order: 1 },
    { menu_item_id: itemBurger, related_item_id: itemDrink, sort_order: 2 },
    { menu_item_id: itemBurger, related_item_id: itemNuggets, sort_order: 3 },
  ]);

  // --- B. Jollibee ---
  const [catJollibeeChicken] = await knex("menu_categories").insert({ restaurant_id: jollibeeId, name: "Chickenjoy", sort_order: 1 });
  const [catJollibeeBurger] = await knex("menu_categories").insert({ restaurant_id: jollibeeId, name: "Yumburgers", sort_order: 2 });

  await knex("menu_items").insert([
    {
      restaurant_id: jollibeeId,
      category_id: catJollibeeChicken,
      name: "2-Piece Chickenjoy with Rice & Gravy",
      description: "World famous crispy juicy fried chicken served with steamed rice and signature gravy.",
      image_url: "/restaurant_jollibee.png",
      base_price: 219.00,
      is_available: true,
      sort_order: 1,
    },
    {
      restaurant_id: jollibeeId,
      category_id: catJollibeeBurger,
      name: "Cheesy Bacon Yumburger",
      description: "100% pure beef patty with creamy cheese and crispy bacon strips.",
      image_url: "/item1.png",
      base_price: 159.00,
      is_available: true,
      sort_order: 2,
    },
  ]);

  // --- C. Chowking ---
  const [catChowkingRice] = await knex("menu_categories").insert({ restaurant_id: chowkingId, name: "Chao Fan & Platters", sort_order: 1 });
  const [catChowkingDimsum] = await knex("menu_categories").insert({ restaurant_id: chowkingId, name: "Dim Sum & Noodles", sort_order: 2 });

  await knex("menu_items").insert([
    {
      restaurant_id: chowkingId,
      category_id: catChowkingRice,
      name: "Chinese-Style Fried Chicken Lauriat",
      description: "Crispy chicken, pork siomai, chao fan rice, pancit canton, and chicharon.",
      image_url: "/restaurant_chowking.png",
      base_price: 289.00,
      is_available: true,
      sort_order: 1,
    },
    {
      restaurant_id: chowkingId,
      category_id: catChowkingDimsum,
      name: "Steamed Pork & Shrimp Siomai (4pcs)",
      description: "Savory pork and shrimp dumplings with chili garlic sauce.",
      image_url: "/item2.png",
      base_price: 139.00,
      is_available: true,
      sort_order: 2,
    },
  ]);

  // --- E. Vouchers ---
  await knex("voucher_redemptions").del();
  await knex("vouchers").del();

  await knex("vouchers").insert([
    {
      code: "WELCOME50",
      discount_type: "percent",
      discount_value: 50.00,
      min_order_amount: 299.00,
      max_discount_amount: 200.00,
      usage_limit: 500,
      per_user_limit: 1,
      is_active: true,
    },
    {
      code: "FREEDEL",
      discount_type: "free_delivery",
      discount_value: 49.00,
      min_order_amount: 199.00,
      max_discount_amount: 49.00,
      usage_limit: 1000,
      per_user_limit: 3,
      is_active: true,
    },
    {
      code: "FOODMENIA100",
      discount_type: "flat",
      discount_value: 100.00,
      min_order_amount: 499.00,
      usage_limit: 200,
      per_user_limit: 1,
      is_active: true,
    },
  ]);
}
