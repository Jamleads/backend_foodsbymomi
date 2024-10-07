DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS advert_messages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS waitlists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categorys;
DROP TABLE IF EXISTS pay;
-- DROP TABLE IF EXISTS voucher_orders;
DROP TABLE IF EXISTS voucher_interest;
DROP TABLE IF EXISTS voucher;
DROP TABLE IF EXISTS discount_code;
DROP TABLE IF EXISTS referral_rewards_percentage;

CREATE TABLE waitlists (
	id INT AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    heard_about_us ENUM("friend", "news", "socail media", "event"),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE voucher (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    voucherNgn DECIMAL(10, 6) NOT NULL DEFAULT "0.00",
    voucherUs DECIMAL(10, 6) NOT NULL DEFAULT "0.00", 
    voucherUk DECIMAL(10, 6) NOT NULL DEFAULT "0.00",
    voucherGhana DECIMAL(10, 6) NOT NULL DEFAULT "0.00",
    voucherCanada DECIMAL(10, 6) NOT NULL DEFAULT "0.00",
    voucher DECIMAL(10, 6) NOT NULL DEFAULT "0.00"
);

CREATE TABLE voucher_interest (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    percentage_rate DECIMAL(10, 2) NOT NULL
);

CREATE TABLE users (
	id INT AUTO_INCREMENT PRIMARY KEY,  
    name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) UNIQUE, 
    phone VARCHAR(255),
    referralCode VARCHAR(64) UNIQUE,
    referred_by VARCHAR(64),
    password VARCHAR(255) NOT NULL, 
    role ENUM ('superAdmin', 'admin', 'customer') NOT NULL DEFAULT 'customer', 
    active ENUM ('true', 'false') NOT NULL DEFAULT 'true',
    imageName VARCHAR(255),
    imageUrl VARCHAR(700),
    resetToken VARCHAR(255), 
    passwordResetToken VARCHAR(255), 
    passwordResetExpires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() 
);

CREATE TABLE products (
	id INT AUTO_INCREMENT PRIMARY KEY, 
    title VARCHAR(255) NOT NULL,
    priceNgn DECIMAL(10, 2) NOT NULL,
    priceUs DECIMAL(10, 2) NOT NULL, 
    priceUk DECIMAL(10, 2) NOT NULL, 
    priceGhana DECIMAL(10, 2) NOT NULL, 
    priceCanada DECIMAL(10, 2) NOT NULL, 
    nigeriaCode VARCHAR(8) NOT NULL DEFAULT 'NGN',
    ghanaCode VARCHAR(8) NOT NULL DEFAULT 'GHS',
    ukCode VARCHAR(8) NOT NULL DEFAULT 'GBP',
    usCode VARCHAR(8) NOT NULL DEFAULT 'USD',
    canadaCode VARCHAR(8) NOT NULL DEFAULT 'CAD',
    categories VARCHAR(512) NOT NULL,
    imageUrl VARCHAR(255) NOT NULL,
	imageName VARCHAR(255) NOT NULL,
    featured ENUM("true", "false") NOT NULL DEFAULT "false",
    collectionTitle VARCHAR(255) NOT NULL,
    collectionDescription VARCHAR(512) NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE carts (
	id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NOT NULL,
    product_id INT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE favorites (
	id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE advert_messages (
	id INT AUTO_INCREMENT PRIMARY KEY,
    text VARCHAR(512) NOT NULL,
    image VARCHAR(255),
    backgroundImage VARCHAR(255),
	created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE TABLE orders (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     user_id INT NOT NULL,
--     date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     status ENUM('Pending', 'Processing', 'completed', 'Cancelled') NOT NULL DEFAULT 'pending',
--     total DECIMAL(10, 2) NOT NULL,
--     currency VARCHAR(16) NOT NULL,
-- 	created_at TIMESTAMP DEFAULT NOW(),
--     FOREIGN KEY (user_id) REFERENCES users (id)
-- );

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Processing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    currency VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    order_id VARCHAR(250) NOT NULL,
    transaction_id VARCHAR(250) NOT NULL,
    channel VARCHAR(150) NOT NULL,
    time VARCHAR(200) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE pay (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(16) NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(16) NOT NULL,
    status ENUM('Pending', 'Completed', 'Failed') NOT NULL,
	created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE referrals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT NOT NULL,
    referee_id INT NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE discount_code (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) UNIQUE,
    percentage_discounted DECIMAL(10, 2) NOT NULL,
    number_of_times_to_be_use INT NOT NULL,
    number_of_times_used INT DEFAULT 0,
    status ENUM('Ongoing', 'Completed') NOT NULL,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE referral_rewards_percentage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    percentage_to_earn DECIMAL(10, 2) DEFAULT 0,
	created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_categorys (
	id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);



-- ogunyemiadetunji17@gmail.com
-- Adetunji@Examfeed$12#!

