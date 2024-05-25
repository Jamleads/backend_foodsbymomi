DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS advert_messages;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS waitlists;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;

CREATE TABLE waitlists (
	id INT AUTO_INCREMENT PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    heard_about_us ENUM("friend", "twitter", "facebook"),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
	id INT AUTO_INCREMENT PRIMARY KEY,  
    name VARCHAR(255) NOT NULL, 
    email VARCHAR(255) UNIQUE, 
    phone VARCHAR(255),
    password VARCHAR(255) NOT NULL, 
    role ENUM ('admin', 'customer') NOT NULL DEFAULT 'customer', 
    active ENUM ('true', 'false') NOT NULL DEFAULT 'true',
    profilePhotoName VARCHAR(255),
    profilePhotoUrl VARCHAR(700),
    profilePhotoUrlExp TIMESTAMP,
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
    image VARCHAR(255) NOT NULL,
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
    backgroundImage VARCHAR(255)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Processing', 'completed', 'Cancelled') NOT NULL DEFAULT 'pending',
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('Pending', 'Completed', 'Failed') NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

