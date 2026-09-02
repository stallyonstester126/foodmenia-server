import { db } from "./connection.js";

async function wipeSeededData() {
  console.log("Beginning cleanup of seeded database records...");

  try {
    // 1. Delete dependent records
    const favCount = await db("favorites").del();
    console.log(`Deleted ${favCount} favorite items.`);

    const relCount = await db("related_items").del();
    console.log(`Deleted ${relCount} related items.`);

    const addonOptCount = await db("item_addon_options").del();
    console.log(`Deleted ${addonOptCount} addon options.`);

    const addonGrpCount = await db("item_addon_groups").del();
    console.log(`Deleted ${addonGrpCount} addon groups.`);

    const menuItemsCount = await db("menu_items").del();
    console.log(`Deleted ${menuItemsCount} menu items.`);

    const menuCatCount = await db("menu_categories").del();
    console.log(`Deleted ${menuCatCount} menu categories.`);

    const restCuisinesCount = await db("restaurant_cuisines").del();
    console.log(`Deleted ${restCuisinesCount} restaurant cuisine links.`);

    const restCount = await db("restaurants").del();
    console.log(`Deleted ${restCount} restaurants and shops.`);

    const cuisineCount = await db("cuisines").del();
    console.log(`Deleted ${cuisineCount} cuisines.`);

    const voucherRedemptionsCount = await db("voucher_redemptions").del();
    console.log(`Deleted ${voucherRedemptionsCount} voucher redemptions.`);

    const voucherCount = await db("vouchers").del();
    console.log(`Deleted ${voucherCount} vouchers.`);

    // 2. Re-seed clean category definitions for onboarding
    console.log("Inserting default clean cuisine/shop categories for onboarding...");
    await db("cuisines").insert([
      { name: "Fast Food", image_url: "/item1.png" },
      { name: "Chinese", image_url: "/item2.png" },
      { name: "Italian", image_url: "/item3.png" },
      { name: "Desserts", image_url: "/item1.png" },
      { name: "Beverages", image_url: "/item2.png" },
      { name: "Grocery", image_url: "/item1.png" },
      { name: "Bakery", image_url: "/item2.png" },
      { name: "Supermarket", image_url: "/item3.png" },
      { name: "Fresh Produce", image_url: "/item1.png" },
    ]);

    console.log("Successfully wiped all seeded venue & menu data. DB is clean!");
    process.exit(0);
  } catch (error) {
    console.error("Error wiping seeded data:", error);
    process.exit(1);
  }
}

wipeSeededData();
