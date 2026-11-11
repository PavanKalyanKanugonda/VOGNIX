-- V2__seed_data.sql
-- VOGNIX Initial Seed Data (Roles, Categories, Brands, 32 Products, Images, Variants, Inventory, Coupons)

-- 1. Seed Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ROLE_CUSTOMER', 'Standard customer with shopping, cart, wishlist, and order privileges'),
(2, 'ROLE_ADMIN', 'Platform administrator with catalog, inventory, order status, and audit privileges');

-- 2. Seed Categories
INSERT INTO categories (id, name, slug, description, parent_id, image_url) VALUES
(1, 'Men Fashion', 'men-fashion', 'Contemporary men clothing, footwear and everyday essentials', NULL, 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80'),
(2, 'Women Fashion', 'women-fashion', 'Curated women luxury wear, ethnic elegance and high street apparel', NULL, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80'),
(3, 'Kids Wear', 'kids-wear', 'Comfortable, stylish, durable clothing for boys and girls', NULL, 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=800&q=80'),
(4, 'Footwear', 'footwear', 'Sneakers, formal brogues, running trainers, and casual loafers', NULL, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80'),
(5, 'Accessories & Watches', 'accessories-watches', 'Luxury chronographs, leather wallets, sunglasses, and belts', NULL, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'),
(6, 'Bags & Luggage', 'bags-luggage', 'Leather backpacks, messenger bags, and travel duffles', NULL, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80');

-- 3. Seed Brands
INSERT INTO brands (id, name, slug, logo_url, description) VALUES
(1, 'VOGNIX Luxe', 'vognix-luxe', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=300&q=80', 'In-house signature luxury couture & sharp tailoring'),
(2, 'Noir & Blanc', 'noir-et-blanc', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80', 'Minimalist monochromatic aesthetic with contemporary European styling'),
(3, 'Urban Thread', 'urban-thread', 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=300&q=80', 'Youth street style, raw denims, and oversized graphic apparel'),
(4, 'Aurelia Studio', 'aurelia-studio', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=300&q=80', 'Bespoke feminine silhouettes, floral chiffons, and evening silk gowns'),
(5, 'SoleFlex', 'soleflex', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=300&q=80', 'Engineered footwear with ergonomic insoles and athletic performance'),
(6, 'ChronoCraft', 'chronocraft', 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=300&q=80', 'Precision mechanical and sapphire crystal wristwatches'),
(7, 'WanderPack', 'wanderpack', 'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=300&q=80', 'Handcrafted genuine top-grain leather bags and travel accessories'),
(8, 'StreetVibe', 'streetvibe', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=300&q=80', 'Athleisure wear and trendy casual layers');

-- 4. Seed Products (32 Realistic Items)
INSERT INTO products (id, title, slug, description, brand_id, category_id, gender, base_price, discount_percent, rating, review_count, is_active, is_featured) VALUES
-- Men's Category (Products 1-8)
(1, 'Slim-Fit Poplin Oxford Shirt', 'slim-fit-poplin-oxford-shirt', 'Crafted from 100% long-staple Egyptian cotton with a soft washed finish. Features a tailored slim cut, button-down collar, and mother-of-pearl buttons. Ideal for boardroom meetings or smart-casual evenings.', 1, 1, 'MEN', 2499.00, 20, 4.6, 128, TRUE, TRUE),
(2, 'Selvedge Raw Denim Trucker Jacket', 'selvedge-raw-denim-trucker-jacket', 'Constructed from heavy 14oz Japanese selvedge denim. Vintage contrast brass rivets, dual chest flap pockets, and adjustable waist tabs. Develops unique personalized fading over time.', 3, 1, 'MEN', 4999.00, 15, 4.8, 94, TRUE, TRUE),
(3, 'Tailored Stretch Chino Trousers', 'tailored-stretch-chino-trousers', 'Premium cotton-twill chinos infused with 3% elastane for unrestricted mobility. Flat-front design, coin pocket detail, and durable horn buttons. Versatile wardrobe staple for all seasons.', 2, 1, 'MEN', 2199.00, 30, 4.4, 215, TRUE, FALSE),
(4, 'Supima Cotton Pique Polo T-Shirt', 'supima-cotton-pique-polo-tshirt', 'Knitted from rare Supima cotton renowned for strength and softness. Contrast tipping on rib-knit collar and cuffs. High color retention wash after wash.', 8, 1, 'MEN', 1599.00, 25, 4.5, 340, TRUE, FALSE),
(5, 'Fine Gauge Merino Wool Crewneck', 'fine-gauge-merino-wool-crewneck', 'Ultra-soft Australian extra-fine merino wool that regulates body temperature naturally. Lightweight rib knit hem and cuff for a crisp layer under blazers.', 1, 1, 'MEN', 3899.00, 10, 4.9, 62, TRUE, TRUE),
(6, 'Relaxed Fit Graphic Heavyweight Hoodie', 'relaxed-fit-graphic-heavyweight-hoodie', '450 GSM French terry cotton fleece with ribbed gusset side panels. Dropped shoulder streetwear silhouette with custom minimal VOGNIX typography chest embroidery.', 3, 1, 'MEN', 3299.00, 35, 4.7, 180, TRUE, FALSE),
(7, 'Textured Linen Summer Blazer', 'textured-linen-summer-blazer', 'Unlined, deconstructed summer jacket cut from pure Normandy flax linen. Notch lapels, dual side vents, and patch pockets. Keeps you effortlessly cool in warm weather.', 2, 1, 'MEN', 6999.00, 20, 4.8, 48, TRUE, TRUE),
(8, 'Tactical Cargo Joggers with Bungee Cuffs', 'tactical-cargo-joggers-bungee-cuffs', 'Water-repellent ripstop stretch fabric equipped with 6 utility pockets. Elasticated waistband with internal drawcord and toggle bungee ankles.', 8, 1, 'MEN', 2799.00, 40, 4.3, 112, TRUE, FALSE),

-- Women's Category (Products 9-16)
(9, 'Botanical Chiffon Tiered Maxi Dress', 'botanical-chiffon-tiered-maxi-dress', 'Airy georgette chiffon adorned with delicate hand-drawn botanical blossoms. Features a flattering V-neckline, smocked elasticated waist, and romantic ruffled tiered hem.', 4, 2, 'WOMEN', 3499.00, 25, 4.8, 310, TRUE, TRUE),
(10, 'Structured Double-Breasted Linen Blazer', 'structured-double-breasted-linen-blazer', 'Sharp sartorial tailoring meets relaxed elegance. Cut with peak lapels, tortoise-shell accent buttons, and interior piping. An essential modern power-dressing statement.', 2, 2, 'WOMEN', 5499.00, 20, 4.9, 142, TRUE, TRUE),
(11, 'High-Waist Pleated Wide Leg Palazzo', 'high-waist-pleated-wide-leg-palazzo', 'Fluid crepe fabric that drapes gracefully with every step. Deep front inverted pleats, invisible side zipper, and clean tailored waistband.', 4, 2, 'WOMEN', 2499.00, 30, 4.6, 185, TRUE, FALSE),
(12, 'Pure Mulberry Silk Wrap Blouse', 'pure-mulberry-silk-wrap-blouse', '100% 19mm grade-6A Mulberry silk with a luminous luster. Adjustable side tie closure that flatters every silhouette. French seam construction throughout.', 1, 2, 'WOMEN', 4299.00, 15, 4.9, 75, TRUE, TRUE),
(13, 'Ribbed Knit Sweetheart Neck Top', 'ribbed-knit-sweetheart-neck-top', 'Sculpted form-fitting modal blend sweater top. Architectural sweetheart neckline and elbow-length sleeves. Pairs effortlessly with tailored trousers or denim.', 3, 2, 'WOMEN', 1699.00, 40, 4.5, 230, TRUE, FALSE),
(14, 'Embroidered Kashmiri Wool Pashmina Stole', 'embroidered-kashmiri-wool-pashmina-stole', 'Hand-loomed featherweight cashmere wool featuring intricate Ari thread embroidery along the borders. Luxurious warmth with heirloom craftsmanship.', 1, 2, 'WOMEN', 5999.00, 10, 5.0, 56, TRUE, TRUE),
(15, 'Vintage Wash High-Rise Mom Jeans', 'vintage-wash-high-rise-mom-jeans', 'Non-stretch authentic 100% cotton denim in washed indigo. Snug high waist tapering down the ankle with authentic five-pocket detailing.', 3, 2, 'WOMEN', 2899.00, 30, 4.4, 420, TRUE, FALSE),
(16, 'Cropped Boucle Tweed Jacket', 'cropped-boucle-tweed-jacket', 'Classic Parisian chic outerwear crafted from textured metallic-woven boucle yarn. Antiqued gold lion buttons, frayed fringe trims, and silky inner lining.', 4, 2, 'WOMEN', 4999.00, 20, 4.7, 98, TRUE, FALSE),

-- Kids' Category (Products 17-20)
(17, 'Kids Organic Cotton Graphic Tee Combo', 'kids-organic-cotton-graphic-tee-combo', 'Pack of 3 vibrant breathable t-shirts made with 100% GOTS-certified organic cotton. Non-toxic water-based prints and tagless comfort necks.', 8, 3, 'KIDS', 1299.00, 30, 4.7, 260, TRUE, FALSE),
(18, 'Kids Stretch Denim Overalls Dungaree', 'kids-stretch-denim-overalls-dungaree', 'Durable yet soft cotton-spandex denim designed for all-day playground adventures. Adjustable metal buckle straps and reinforced knee patches.', 3, 3, 'KIDS', 1899.00, 25, 4.8, 140, TRUE, TRUE),
(19, 'Kids Lightweight Hooded Puffer Windcheater', 'kids-lightweight-hooded-puffer-windcheater', 'Thermal featherweight polyester insulation with water-resistant shell. Contrast zipper, elastic cuffs, and packable matching travel pouch.', 8, 3, 'KIDS', 2299.00, 35, 4.6, 92, TRUE, FALSE),
(20, 'Kids Flounced Party Skater Frock', 'kids-flounced-party-skater-frock', 'Twirl-ready party dress with satin bow waistband and multi-layer glitter tulle skirt. Breathable pure cotton lining gentle on young skin.', 4, 3, 'KIDS', 1799.00, 20, 4.9, 115, TRUE, FALSE),

-- Footwear (Products 21-24)
(21, 'VOGNIX Neo-Stride Cloud Foam Runners', 'vognix-neo-stride-cloud-foam-runners', 'Next-generation running sneakers with breathable engineered knit upper and ultra-responsive Nitrogen-infused bouncy midsole. TPU heel stabilizer for zero slippage.', 5, 4, 'UNISEX', 3999.00, 25, 4.7, 390, TRUE, TRUE),
(22, 'Heritage Hand-Burnished Leather Brogues', 'heritage-hand-burnished-leather-brogues', 'Traditional Goodyear-welted dress shoes in full-grain Italian calfskin. Hand-punched brogue medallions, leather sole, and cushioned memory foam footbed.', 1, 4, 'MEN', 5999.00, 15, 4.9, 110, TRUE, TRUE),
(23, 'Clean-Cut Minimal White Court Sneakers', 'clean-cut-minimal-white-court-sneakers', 'Monochrome tennis cupsole sneaker in butter-soft nappa leather. Waxed cotton laces, padded collar, and vulcanized rubber grip outsole.', 2, 4, 'UNISEX', 3499.00, 20, 4.8, 520, TRUE, TRUE),
(24, 'Italian Suede Tassel Driving Loafers', 'italian-suede-tassel-driving-loafers', 'Supple suede slip-on shoes with hand-stitched apron toe and twin tassels. Pebble rubber split-sole for driving comfort and casual elegance.', 5, 4, 'MEN', 4499.00, 30, 4.6, 88, TRUE, FALSE),

-- Accessories & Watches (Products 25-28)
(25, 'ChronoCraft Heritage Automatic Watch', 'chronocraft-heritage-automatic-watch', '316L surgical-grade stainless steel case, anti-reflective sapphire crystal glass, and Japanese automatic 24-jewel movement with 42-hour power reserve. Water-resistant to 10 ATM.', 6, 5, 'MEN', 11999.00, 20, 4.9, 145, TRUE, TRUE),
(26, 'Minimalist Rose Gold Mesh Ladies Watch', 'minimalist-rose-gold-mesh-ladies-watch', 'Ultra-thin 6.8mm case in ionic rose gold plating. Sunray dial with applied hour indices and interchangeable quick-release Milanese mesh strap.', 6, 5, 'WOMEN', 6499.00, 25, 4.8, 230, TRUE, TRUE),
(27, 'Polarized Hexagonal Metal Sunglasses', 'polarized-hexagonal-metal-sunglasses', 'Lightweight titanium alloy frame with UV400 polarized scratch-resistant mineral lenses. Custom adjustable silicone nose pads for all-day comfort.', 2, 5, 'UNISEX', 2299.00, 45, 4.5, 310, TRUE, FALSE),
(28, 'Reversible Italian Full-Grain Leather Belt', 'reversible-italian-full-grain-leather-belt', 'Two-in-one wardrobe classic switching between rich espresso brown and sleek jet black. Rotatable brushed gunmetal buckle mechanism.', 1, 5, 'MEN', 1899.00, 30, 4.7, 195, TRUE, FALSE),

-- Bags & Luggage (Products 29-32)
(29, 'Top-Grain Leather Commuter Briefcase', 'top-grain-leather-commuter-briefcase', 'Vintage pull-up leather messenger bag with padded 15.6-inch laptop compartment. Heavy-duty YKK brass zippers and detachable padded shoulder strap.', 7, 6, 'UNISEX', 6999.00, 20, 4.9, 84, TRUE, TRUE),
(30, 'Vintage Waxed Canvas Weekender Duffle', 'vintage-waxed-canvas-weekender-duffle', '18oz water-repellent army duck canvas trimmed with thick vegetable-tanned bridle leather. Built-in dedicated shoe compartment and trolley sleeve.', 7, 6, 'UNISEX', 4899.00, 25, 4.8, 160, TRUE, TRUE),
(31, 'Sculptural Leather Crescent Shoulder Bag', 'sculptural-leather-crescent-shoulder-bag', 'Modern architectural curved silhouette crafted from smooth box-calf leather. Magnetic top flap closure with signature gold-toned hardware buckle.', 4, 6, 'WOMEN', 3899.00, 30, 4.7, 125, TRUE, FALSE),
(32, 'Urban Anti-Theft Water-Resistant Laptop Backpack', 'urban-anti-theft-water-resistant-laptop-backpack', 'Streamlined ballistic nylon shell featuring hidden zipper compartments, integrated USB charging port pass-through, and ergonomic air-mesh back padding.', 7, 6, 'UNISEX', 2999.00, 35, 4.6, 280, TRUE, FALSE);

-- 5. Seed Product Images (High-quality verified Unsplash fashion URLs)
INSERT INTO product_images (product_id, image_url, display_order, is_primary) VALUES
(1, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(1, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', 2, FALSE),
(2, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(2, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80', 2, FALSE),
(3, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(4, 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(5, 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(6, 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(7, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(8, 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(9, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(9, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', 2, FALSE),
(10, 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(11, 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(12, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(13, 'https://images.unsplash.com/photo-1534126511673-b6899657816a?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(14, 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(15, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(16, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(17, 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(18, 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(19, 'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(20, 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(21, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(21, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80', 2, FALSE),
(22, 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(23, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(24, 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(25, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(25, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80', 2, FALSE),
(26, 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(27, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(28, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(29, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(30, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(31, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80', 1, TRUE),
(32, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80', 1, TRUE);

-- 6. Seed Product Variants & Inventory (SKUs, Sizes, Colors)
-- Product 1: Oxford Shirt (Sizes S, M, L, XL - White & Light Blue)
INSERT INTO product_variants (id, product_id, sku, size, color, color_code, price_override) VALUES
(1, 1, 'VOG-OXF-WHT-S', 'S', 'Pure White', '#FFFFFF', NULL),
(2, 1, 'VOG-OXF-WHT-M', 'M', 'Pure White', '#FFFFFF', NULL),
(3, 1, 'VOG-OXF-WHT-L', 'L', 'Pure White', '#FFFFFF', NULL),
(4, 1, 'VOG-OXF-WHT-XL', 'XL', 'Pure White', '#FFFFFF', NULL),
(5, 1, 'VOG-OXF-BLU-M', 'M', 'Sky Blue', '#BAE6FD', NULL),
(6, 1, 'VOG-OXF-BLU-L', 'L', 'Sky Blue', '#BAE6FD', NULL),

-- Product 2: Denim Trucker (M, L, XL - Indigo)
(7, 2, 'VOG-JCK-IND-M', 'M', 'Raw Indigo', '#1E3A8A', NULL),
(8, 2, 'VOG-JCK-IND-L', 'L', 'Raw Indigo', '#1E3A8A', NULL),
(9, 2, 'VOG-JCK-IND-XL', 'XL', 'Raw Indigo', '#1E3A8A', NULL),

-- Product 3: Chinos (30, 32, 34 - Khaki & Navy)
(10, 3, 'VOG-CHN-KHK-30', '30', 'Sand Khaki', '#D4B996', NULL),
(11, 3, 'VOG-CHN-KHK-32', '32', 'Sand Khaki', '#D4B996', NULL),
(12, 3, 'VOG-CHN-KHK-34', '34', 'Sand Khaki', '#D4B996', NULL),
(13, 3, 'VOG-CHN-NVY-32', '32', 'Deep Navy', '#0F172A', NULL),

-- Product 4: Polo (M, L, XL - Maroon & Olive)
(14, 4, 'VOG-POL-MRN-M', 'M', 'Burgundy Maroon', '#881337', NULL),
(15, 4, 'VOG-POL-MRN-L', 'L', 'Burgundy Maroon', '#881337', NULL),
(16, 4, 'VOG-POL-OLV-M', 'M', 'Military Olive', '#365314', NULL),

-- Product 5: Merino Crewneck (S, M, L - Charcoal)
(17, 5, 'VOG-SWT-CHR-S', 'S', 'Charcoal Heather', '#334155', NULL),
(18, 5, 'VOG-SWT-CHR-M', 'M', 'Charcoal Heather', '#334155', NULL),
(19, 5, 'VOG-SWT-CHR-L', 'L', 'Charcoal Heather', '#334155', NULL),

-- Product 6: Heavyweight Hoodie (M, L, XL - Jet Black)
(20, 6, 'VOG-HOD-BLK-M', 'M', 'Jet Black', '#09090B', NULL),
(21, 6, 'VOG-HOD-BLK-L', 'L', 'Jet Black', '#09090B', NULL),
(22, 6, 'VOG-HOD-BLK-XL', 'XL', 'Jet Black', '#09090B', NULL),

-- Product 7: Linen Blazer (38, 40, 42 - Oatmeal Beige)
(23, 7, 'VOG-BLZ-OAT-38', '38', 'Oatmeal Beige', '#E2D9CC', NULL),
(24, 7, 'VOG-BLZ-OAT-40', '40', 'Oatmeal Beige', '#E2D9CC', NULL),
(25, 7, 'VOG-BLZ-OAT-42', '42', 'Oatmeal Beige', '#E2D9CC', NULL),

-- Product 8: Tactical Cargo (M, L - Olive)
(26, 8, 'VOG-CRG-OLV-M', 'M', 'Tactical Olive', '#3F4E2F', NULL),
(27, 8, 'VOG-CRG-OLV-L', 'L', 'Tactical Olive', '#3F4E2F', NULL),

-- Product 9: Chiffon Maxi (XS, S, M, L - Sage Floral)
(28, 9, 'VOG-DRS-FLR-XS', 'XS', 'Sage Floral', '#6E8B74', NULL),
(29, 9, 'VOG-DRS-FLR-S', 'S', 'Sage Floral', '#6E8B74', NULL),
(30, 9, 'VOG-DRS-FLR-M', 'M', 'Sage Floral', '#6E8B74', NULL),
(31, 9, 'VOG-DRS-FLR-L', 'L', 'Sage Floral', '#6E8B74', NULL),

-- Product 10: Double Breasted Blazer (S, M, L - Ivory Cream)
(32, 10, 'VOG-WBL-IVR-S', 'S', 'Ivory Cream', '#FAF5EE', NULL),
(33, 10, 'VOG-WBL-IVR-M', 'M', 'Ivory Cream', '#FAF5EE', NULL),
(34, 10, 'VOG-WBL-IVR-L', 'L', 'Ivory Cream', '#FAF5EE', NULL),

-- Product 11: Pleated Palazzo (28, 30, 32 - Terracotta)
(35, 11, 'VOG-PLZ-TER-28', '28', 'Terracotta Rust', '#9C412C', NULL),
(36, 11, 'VOG-PLZ-TER-30', '30', 'Terracotta Rust', '#9C412C', NULL),
(37, 11, 'VOG-PLZ-TER-32', '32', 'Terracotta Rust', '#9C412C', NULL),

-- Product 12: Silk Wrap Blouse (S, M, L - Champagne)
(38, 12, 'VOG-SLK-CHP-S', 'S', 'Champagne Gold', '#F7E7CE', NULL),
(39, 12, 'VOG-SLK-CHP-M', 'M', 'Champagne Gold', '#F7E7CE', NULL),
(40, 12, 'VOG-SLK-CHP-L', 'L', 'Champagne Gold', '#F7E7CE', NULL),

-- Product 13: Sweetheart Top (S, M, L - Noir Black)
(41, 13, 'VOG-TOP-BLK-S', 'S', 'Noir Black', '#111827', NULL),
(42, 13, 'VOG-TOP-BLK-M', 'M', 'Noir Black', '#111827', NULL),

-- Product 14: Kashmiri Pashmina (Free Size - Royal Crimson)
(43, 14, 'VOG-PSH-ROY-FS', 'Free Size', 'Royal Crimson', '#991B1B', NULL),

-- Product 15: Mom Jeans (26, 28, 30, 32 - Light Vintage Blue)
(44, 15, 'VOG-JNS-VNT-28', '28', 'Vintage Wash', '#93C5FD', NULL),
(45, 15, 'VOG-JNS-VNT-30', '30', 'Vintage Wash', '#93C5FD', NULL),

-- Product 16: Boucle Tweed Jacket (S, M - French Vanilla)
(46, 16, 'VOG-TWD-VAN-S', 'S', 'French Vanilla', '#FDFBF7', NULL),
(47, 16, 'VOG-TWD-VAN-M', 'M', 'French Vanilla', '#FDFBF7', NULL),

-- Kids Products 17-20
(48, 17, 'VOG-KID-TEE-4Y', '4-5Y', 'Multi-Pack', '#38BDF8', NULL),
(49, 17, 'VOG-KID-TEE-6Y', '6-7Y', 'Multi-Pack', '#38BDF8', NULL),
(50, 17, 'VOG-KID-TEE-8Y', '8-9Y', 'Multi-Pack', '#38BDF8', NULL),
(51, 18, 'VOG-KID-DNG-6Y', '6-7Y', 'Denim Blue', '#2563EB', NULL),
(52, 18, 'VOG-KID-DNG-8Y', '8-9Y', 'Denim Blue', '#2563EB', NULL),
(53, 19, 'VOG-KID-PFR-6Y', '6-7Y', 'Electric Yellow', '#EAB308', NULL),
(54, 19, 'VOG-KID-PFR-8Y', '8-9Y', 'Electric Yellow', '#EAB308', NULL),
(55, 20, 'VOG-KID-FRK-5Y', '5-6Y', 'Pastel Pink', '#F472B6', NULL),

-- Footwear Products 21-24 (UK Sizes 7, 8, 9, 10, 11)
(56, 21, 'VOG-RUN-CHR-08', 'UK 8', 'Crimson Red / Black', '#E11D48', NULL),
(57, 21, 'VOG-RUN-CHR-09', 'UK 9', 'Crimson Red / Black', '#E11D48', NULL),
(58, 21, 'VOG-RUN-CHR-10', 'UK 10', 'Crimson Red / Black', '#E11D48', NULL),
(59, 22, 'VOG-BRG-BRN-08', 'UK 8', 'Cognac Tan', '#78350F', NULL),
(60, 22, 'VOG-BRG-BRN-09', 'UK 9', 'Cognac Tan', '#78350F', NULL),
(61, 22, 'VOG-BRG-BRN-10', 'UK 10', 'Cognac Tan', '#78350F', NULL),
(62, 23, 'VOG-SNK-WHT-08', 'UK 8', 'Optic White', '#F8FAFC', NULL),
(63, 23, 'VOG-SNK-WHT-09', 'UK 9', 'Optic White', '#F8FAFC', NULL),
(64, 23, 'VOG-SNK-WHT-10', 'UK 10', 'Optic White', '#F8FAFC', NULL),
(65, 24, 'VOG-LOF-SUD-08', 'UK 8', 'Dark Chocolate Suede', '#451A03', NULL),
(66, 24, 'VOG-LOF-SUD-09', 'UK 9', 'Dark Chocolate Suede', '#451A03', NULL),

-- Watches & Accessories 25-28
(67, 25, 'VOG-WTC-AUT-SLV', '40mm', 'Silver / Black Dial', '#64748B', NULL),
(68, 26, 'VOG-WTC-MSH-RSG', '32mm', 'Rose Gold', '#FB7185', NULL),
(69, 27, 'VOG-SNG-POL-GLD', 'Standard', 'Gold / Green Polarized', '#D97706', NULL),
(70, 28, 'VOG-BLT-REV-34', '34-36', 'Reversible Black/Brown', '#18181B', NULL),

-- Bags 29-32
(71, 29, 'VOG-BAG-BRF-BRN', 'One Size', 'Vintage Bourbon', '#92400E', NULL),
(72, 30, 'VOG-BAG-DUF-KHK', '45L', 'Waxed Olive Canvas', '#4B5563', NULL),
(73, 31, 'VOG-BAG-CRS-BLK', 'Medium', 'Onyx Black', '#000000', NULL),
(74, 32, 'VOG-BAG-BPK-GRY', '22L', 'Space Grey', '#374151', NULL);

-- 7. Seed Inventory Records for all 74 Variants
INSERT INTO inventory (variant_id, stock_quantity, reserved_quantity, low_stock_threshold)
SELECT id, 
       CASE 
         WHEN id IN (4, 9, 25, 43, 67) THEN 3  -- Mark a few variants with low stock (3 units) to test low stock alerts
         ELSE 35                               -- Plentiful stock for testing
       END AS stock_quantity,
       0 AS reserved_quantity,
       5 AS low_stock_threshold
FROM product_variants;

-- 8. Seed Promotional Discount Coupons
INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, valid_from, valid_until, usage_limit, used_count, is_active) VALUES
(1, 'VOGNIX10', 'Enjoy 10% off across your entire cart on orders above 1,499', 'PERCENTAGE', 10.00, 1499.00, 1000.00, CURRENT_TIMESTAMP, '2027-12-31 23:59:59', 1000, 12, TRUE),
(2, 'FIRST500', 'Flat 500 instant discount for new shoppers on orders above 2,999', 'FLAT', 500.00, 2999.00, 500.00, CURRENT_TIMESTAMP, '2027-12-31 23:59:59', 500, 28, TRUE),
(3, 'FESTIVE20', 'Grand 20% festive celebration discount on orders above 4,999', 'PERCENTAGE', 20.00, 4999.00, 2500.00, CURRENT_TIMESTAMP, '2027-12-31 23:59:59', 200, 5, TRUE),
(4, 'FREESHIP', 'Free priority doorstep shipping on orders above 799', 'FLAT', 100.00, 799.00, 100.00, CURRENT_TIMESTAMP, '2027-12-31 23:59:59', 5000, 43, TRUE);
