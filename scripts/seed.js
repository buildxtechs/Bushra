const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '../data');

// Helper to write to JSON files
function writeData(collection, data) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function seed() {
    try {
        console.log('Seeding local storage...');

        // Users
        const hashedAdmin = await bcrypt.hash('admin123', 12);
        const hashedCashier = await bcrypt.hash('cashier123', 12);
        const hashedDelivery = await bcrypt.hash('delivery123', 12);
        const hashedCustomer = await bcrypt.hash('customer123', 12);

        const users = [
            { _id: 'u1', name: 'Admin User', email: 'admin@restaurant.com', password: hashedAdmin, phone: '9876543210', role: 'admin', createdAt: new Date().toISOString() },
            { _id: 'u2', name: 'Cashier User', email: 'cashier@restaurant.com', password: hashedCashier, phone: '9876543211', role: 'cashier', createdAt: new Date().toISOString() },
            { _id: 'u3', name: 'Delivery Partner', email: 'delivery@restaurant.com', password: hashedDelivery, phone: '9876543212', role: 'delivery', createdAt: new Date().toISOString() },
            { _id: 'u4', name: 'John Customer', email: 'john@customer.com', password: hashedCustomer, phone: '9876543213', role: 'customer', loyaltyPoints: 150, createdAt: new Date().toISOString() },
        ];
        writeData('users', users);
        console.log('Users seeded');

        // Categories
        const categories = [
            { _id: 'cat_biryani', name: 'Biryani', order: 1, createdAt: new Date().toISOString() },
            { _id: 'cat_salad', name: 'Salad & Dips', order: 2, createdAt: new Date().toISOString() },
            { _id: 'cat_ind_soup', name: 'Indian Soup', order: 3, createdAt: new Date().toISOString() },
            { _id: 'cat_cont_soup', name: 'Continental Soup', order: 4, createdAt: new Date().toISOString() },
            { _id: 'cat_chin_soup', name: 'Chinese Soup', order: 5, createdAt: new Date().toISOString() },
            { _id: 'cat_falooda', name: 'Falooda', order: 6, createdAt: new Date().toISOString() },
            { _id: 'cat_icecreams', name: 'Ice Creams', order: 7, createdAt: new Date().toISOString() },
            { _id: 'cat_mojito', name: 'Soda & Mojito', order: 8, createdAt: new Date().toISOString() },
            { _id: 'cat_gravy', name: 'Gravy - Non Veg', order: 9, createdAt: new Date().toISOString() },
            { _id: 'cat_shawarma', name: 'Shawarma', order: 10, createdAt: new Date().toISOString() },
            { _id: 'cat_quickbites', name: 'Quick Bites', order: 11, createdAt: new Date().toISOString() },
            { _id: 'cat_traditional', name: 'Traditional', order: 12, createdAt: new Date().toISOString() },
            { _id: 'cat_burger', name: 'Burger & Pizza', order: 13, createdAt: new Date().toISOString() },
            { _id: 'cat_juices', name: 'Fresh Juices', order: 14, createdAt: new Date().toISOString() },
            { _id: 'cat_milkshakes', name: 'Milkshakes', order: 15, createdAt: new Date().toISOString() },
        ];
        writeData('categories', categories);
        console.log('Categories seeded');

        // Menu Items
        const menuItems = [
            // Biryani (cat_biryani)
            { _id: 'm_b1', code: '001', name: 'Mutton Biryani', category: 'cat_biryani', price: 329, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_b2', code: '002', name: 'Chicken Biryani', category: 'cat_biryani', price: 279, isVeg: false, createdAt: new Date().toISOString() },

            // Salad & Dips (cat_salad)
            { _id: 'm_s1', code: '003', name: 'Chicken Caesar Salad', category: 'cat_salad', price: 159, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_s2', code: '004', name: 'Coconut Mango Pineapple Salad', category: 'cat_salad', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_s3', code: '005', name: 'Green Salad', category: 'cat_salad', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_s4', code: '006', name: 'Hawaiian Chicken Salad', category: 'cat_salad', price: 149, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_s5', code: '007', name: 'Hummus', category: 'cat_salad', price: 119, isVeg: true, createdAt: new Date().toISOString() },

            // Indian Soup (cat_ind_soup)
            { _id: 'm_is1', code: '008', name: 'Chicken Pepper Soup', category: 'cat_ind_soup', price: 129, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_is2', code: '009', name: 'Mutton Nalli Soup', category: 'cat_ind_soup', price: 169, isVeg: false, createdAt: new Date().toISOString() },

            // Continental Soup (cat_cont_soup)
            { _id: 'm_cs1', code: '010', name: 'Cream of Tomato Soup', category: 'cat_cont_soup', price: 119, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_cs2', code: '011', name: 'Cream of Chicken Soup', category: 'cat_cont_soup', price: 129, isVeg: false, createdAt: new Date().toISOString() },

            // Chinese Soup (cat_chin_soup)
            { _id: 'm_chs1', code: '012', name: 'Sweet Corn Soup (Veg)', category: 'cat_chin_soup', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_chs2', code: '013', name: 'Sweet Corn Soup (Chk)', category: 'cat_chin_soup', price: 119, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_chs3', code: '014', name: 'Clear Soup (Veg)', category: 'cat_chin_soup', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_chs4', code: '015', name: 'Clear Soup (Chk)', category: 'cat_chin_soup', price: 119, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_chs5', code: '016', name: 'Hot and Sour Soup (Veg)', category: 'cat_chin_soup', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_chs6', code: '017', name: 'Hot and Sour Soup (Chk)', category: 'cat_chin_soup', price: 119, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_chs7', code: '018', name: 'Manchow Soup (Veg)', category: 'cat_chin_soup', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_chs8', code: '019', name: 'Manchow Soup (Chk)', category: 'cat_chin_soup', price: 119, isVeg: false, createdAt: new Date().toISOString() },

            // Falooda (cat_falooda)
            { _id: 'm_f1', code: '020', name: 'Bushra Special Falooda', category: 'cat_falooda', price: 149, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f2', code: '021', name: 'Arabian Falooda', category: 'cat_falooda', price: 139, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f3', code: '022', name: 'Royal Falooda', category: 'cat_falooda', price: 119, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f4', code: '023', name: 'Mini Falooda', category: 'cat_falooda', price: 109, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f5', code: '024', name: 'Kesar Falooda', category: 'cat_falooda', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f6', code: '025', name: 'Rose Falooda', category: 'cat_falooda', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f7', code: '026', name: 'Red Cherry Falooda', category: 'cat_falooda', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_f8', code: '027', name: 'Tender Coconut Falooda', category: 'cat_falooda', price: 169, isVeg: true, createdAt: new Date().toISOString() },

            // Ice Creams (cat_icecreams)
            { _id: 'm_ic1', code: '028', name: 'Vanilla Ice Cream', category: 'cat_icecreams', price: 69, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic2', code: '029', name: 'Chocolate Ice Cream', category: 'cat_icecreams', price: 79, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic3', code: '030', name: 'Strawberry Ice Cream', category: 'cat_icecreams', price: 69, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic4', code: '031', name: 'Butterscotch Ice Cream', category: 'cat_icecreams', price: 79, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic5', code: '032', name: 'Blackcurrant Ice Cream', category: 'cat_icecreams', price: 79, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic6', code: '033', name: 'Pista Ice Cream', category: 'cat_icecreams', price: 79, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic7', code: '034', name: 'Mango Ice Cream', category: 'cat_icecreams', price: 69, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ic8', code: '035', name: 'Coconut Ice Cream', category: 'cat_icecreams', price: 89, isVeg: true, createdAt: new Date().toISOString() },

            // Soda & Mojito (cat_mojito)
            { _id: 'm_mj1', code: '036', name: 'Fresh Lemon Soda', category: 'cat_mojito', price: 55, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj2', code: '037', name: 'Lemon Mint Soda', category: 'cat_mojito', price: 69, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj3', code: '038', name: 'Blueberry Mojito', category: 'cat_mojito', price: 89, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj4', code: '039', name: 'Lemon Mint Mojito', category: 'cat_mojito', price: 89, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj5', code: '040', name: 'Pineapple Mojito', category: 'cat_mojito', price: 89, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj6', code: '041', name: 'Virgin Mojito', category: 'cat_mojito', price: 89, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_mj7', code: '042', name: 'Passion Fruit Mojito', category: 'cat_mojito', price: 89, isVeg: true, createdAt: new Date().toISOString() },

            // Gravy - Non Veg (cat_gravy)
            { _id: 'm_g1', code: '043', name: 'Chicken Masala', category: 'cat_gravy', price: 130, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g2', code: '044', name: 'Chicken Pepper Masala', category: 'cat_gravy', price: 170, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g3', code: '045', name: 'Kadai Chicken Gravy', category: 'cat_gravy', price: 160, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g4', code: '046', name: 'Butter Chicken Gravy', category: 'cat_gravy', price: 190, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g5', code: '047', name: 'Chicken Hyderabadi Gravy', category: 'cat_gravy', price: 180, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g6', code: '048', name: 'Methi Chicken Gravy', category: 'cat_gravy', price: 160, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g7', code: '049', name: 'Chicken Chettinad Gravy', category: 'cat_gravy', price: 160, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g8', code: '050', name: 'Chicken Lababdar Gravy', category: 'cat_gravy', price: 180, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g9', code: '051', name: 'Punjabi Chicken Gravy', category: 'cat_gravy', price: 170, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g10', code: '052', name: 'Chicken Lahori Gravy', category: 'cat_gravy', price: 180, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g11', code: '053', name: 'Egg Masala', category: 'cat_gravy', price: 110, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g12', code: '054', name: 'Egg Pepper Masala', category: 'cat_gravy', price: 130, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g13', code: '055', name: 'Prawn Masala', category: 'cat_gravy', price: 180, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g14', code: '056', name: 'Prawn Chettinad Gravy', category: 'cat_gravy', price: 220, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_g15', code: '057', name: 'Prawn Pepper Masala', category: 'cat_gravy', price: 240, isVeg: false, createdAt: new Date().toISOString() },

            // Shawarma (cat_shawarma)
            { _id: 'm_sh1', code: '058', name: 'Shawarma Roll', category: 'cat_shawarma', price: 80, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh2', code: '059', name: 'Special Shawarma Roll', category: 'cat_shawarma', price: 100, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh3', code: '060', name: 'Mexican Shawarma Roll', category: 'cat_shawarma', price: 120, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh4', code: '061', name: 'Shawarma Plate', category: 'cat_shawarma', price: 120, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh5', code: '062', name: 'Special Shawarma Plate', category: 'cat_shawarma', price: 140, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh6', code: '063', name: 'Mexican Shawarma Plate', category: 'cat_shawarma', price: 130, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_sh7', code: '064', name: 'Special Mexican Shawarma Plate', category: 'cat_shawarma', price: 140, isVeg: false, createdAt: new Date().toISOString() },

            // Quick Bites (cat_quickbites)
            { _id: 'm_qb1', code: '065', name: 'French Fries (Regular)', category: 'cat_quickbites', price: 80, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_qb2', code: '066', name: 'French Fries (Large)', category: 'cat_quickbites', price: 150, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_qb3', code: '067', name: 'Masala French Fries (Reg)', category: 'cat_quickbites', price: 90, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_qb4', code: '068', name: 'Masala French Fries (Lrg)', category: 'cat_quickbites', price: 160, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_qb5', code: '069', name: 'Popcorn Chicken (Regular)', category: 'cat_quickbites', price: 100, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_qb6', code: '070', name: 'Popcorn Chicken (Large)', category: 'cat_quickbites', price: 140, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_qb7', code: '071', name: 'Broasted Strips Boneless', category: 'cat_quickbites', price: 160, isVeg: false, createdAt: new Date().toISOString() },

            // Traditional Dishes (cat_traditional)
            { _id: 'm_td1', code: '072', name: 'Mutton Kuttu Parotta', category: 'cat_traditional', price: 209, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_td2', code: '073', name: 'Chicken Kuttu Parotta', category: 'cat_traditional', price: 179, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_td3', code: '074', name: 'Kaadae Phall Pepper Gravy', category: 'cat_traditional', price: 209, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_td4', code: '075', name: 'Mutton Paya (Atukaal)', category: 'cat_traditional', price: 160, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_td5', code: '076', name: 'Ceylon Kheema Mutton Parotta', category: 'cat_traditional', price: 219, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_td6', code: '077', name: 'Ceylon Kheema Chicken Parotta', category: 'cat_traditional', price: 189, isVeg: false, createdAt: new Date().toISOString() },

            // Burger & Pizza (cat_burger)
            { _id: 'm_bp1', code: '078', name: 'Classic Crispy Burger', category: 'cat_burger', price: 139, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_bp2', code: '079', name: 'Fish Fillet Burger', category: 'cat_burger', price: 159, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_bp3', code: '080', name: 'Paneer Cheese Burger', category: 'cat_burger', price: 139, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_bp4', code: '081', name: 'Spicy Veg Burger', category: 'cat_burger', price: 109, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_bp5', code: '082', name: 'Classic Veg Burger', category: 'cat_burger', price: 99, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_bp6', code: '083', name: 'Spicy Juicy Burger', category: 'cat_burger', price: 149, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_bp7', code: '084', name: 'Tandoori Crispy Burger', category: 'cat_burger', price: 159, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_bp8', code: '085', name: 'Cajun Crispy Chicken Burger', category: 'cat_burger', price: 139, isVeg: false, createdAt: new Date().toISOString() },
            { _id: 'm_bp9', code: '086', name: 'Veg Cheese Pizza', category: 'cat_burger', price: 169, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_bp10', code: '087', name: 'Paneer Cheese Pizza', category: 'cat_burger', price: 189, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_bp11', code: '088', name: 'Chicken Cheese Pizza', category: 'cat_burger', price: 199, isVeg: false, createdAt: new Date().toISOString() },

            // Fresh Juices (cat_juices)
            { _id: 'm_j1', code: '089', name: 'Mosambi Juice', category: 'cat_juices', price: 60, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j2', code: '090', name: 'Watermelon Juice', category: 'cat_juices', price: 50, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j3', code: '091', name: 'Orange Juice', category: 'cat_juices', price: 60, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j4', code: '092', name: 'Apple Juice', category: 'cat_juices', price: 50, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j5', code: '093', name: 'Pineapple Juice', category: 'cat_juices', price: 50, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j6', code: '094', name: 'Pomegranate Juice', category: 'cat_juices', price: 60, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j7', code: '095', name: 'Fresh Lime Juice', category: 'cat_juices', price: 40, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_j8', code: '096', name: 'Lemon Mint Cooler', category: 'cat_juices', price: 60, isVeg: true, createdAt: new Date().toISOString() },

            // Milkshakes (cat_milkshakes)
            { _id: 'm_ms1', code: '097', name: 'Vanilla Milkshake', category: 'cat_milkshakes', price: 119, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms2', code: '098', name: 'Strawberry Milkshake', category: 'cat_milkshakes', price: 119, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms3', code: '099', name: 'Chocolate Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms4', code: '100', name: 'Butterscotch Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms5', code: '101', name: 'Pista Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms6', code: '102', name: 'Apple Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms7', code: '103', name: 'Mango Milkshake', category: 'cat_milkshakes', price: 119, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms8', code: '104', name: 'Blackcurrant Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms9', code: '105', name: 'Dry Fruit Milkshake', category: 'cat_milkshakes', price: 139, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms10', code: '106', name: 'KitKat Milkshake', category: 'cat_milkshakes', price: 159, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms11', code: '107', name: 'Oreo Milkshake', category: 'cat_milkshakes', price: 139, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms12', code: '108', name: 'Dates Milkshake', category: 'cat_milkshakes', price: 159, isVeg: true, createdAt: new Date().toISOString() },
            { _id: 'm_ms13', code: '109', name: 'Cold Coffee Milkshake', category: 'cat_milkshakes', price: 129, isVeg: true, createdAt: new Date().toISOString() },
        ];
        writeData('menuitems', menuItems);
        console.log('Menu items seeded');

        // Tables
        const tables = [
            { _id: 't1', number: 1, capacity: 2, status: 'available', createdAt: new Date().toISOString() },
            { _id: 't2', number: 2, capacity: 4, status: 'available', createdAt: new Date().toISOString() },
            { _id: 't3', number: 3, capacity: 4, status: 'available', createdAt: new Date().toISOString() },
            { _id: 't4', number: 4, capacity: 6, status: 'available', createdAt: new Date().toISOString() },
            { _id: 't5', number: 5, capacity: 8, status: 'available', createdAt: new Date().toISOString() },
        ];
        writeData('tables', tables);
        console.log('Tables seeded');

        // Coupons
        const coupons = [
            { _id: 'cp1', code: 'WELCOME20', type: 'percentage', value: 20, minOrderAmount: 300, maxDiscount: 100, usageLimit: 100, expiresAt: '2026-12-31', createdAt: new Date().toISOString() },
            { _id: 'cp2', code: 'FLAT50', type: 'fixed', value: 50, minOrderAmount: 500, usageLimit: 50, expiresAt: '2026-12-31', createdAt: new Date().toISOString() },
        ];
        writeData('coupons', coupons);
        console.log('Coupons seeded');

        // Suppliers
        const suppliers = [
            { _id: 's1', name: 'Fresh Farms', contact: 'Ravi Kumar', phone: '9800000001', email: 'fresh@farms.com', address: 'Market Road, City', createdAt: new Date().toISOString() },
            { _id: 's2', name: 'Spice World', contact: 'Anita', phone: '9800000002', email: 'spice@world.com', address: 'Spice Market, City', createdAt: new Date().toISOString() },
        ];
        writeData('suppliers', suppliers);
        console.log('Suppliers seeded');

        // Inventory
        const inventory = [
            { _id: 'i1', name: 'Rice (Basmati)', quantity: 50, unit: 'kg', minStockLevel: 10, costPerUnit: 80, supplier: 's1', lastRestocked: new Date().toISOString(), createdAt: new Date().toISOString() },
            { _id: 'i2', name: 'Chicken', quantity: 30, unit: 'kg', minStockLevel: 5, costPerUnit: 200, supplier: 's1', lastRestocked: new Date().toISOString(), createdAt: new Date().toISOString() },
        ];
        writeData('inventory', inventory);
        console.log('Inventory seeded');

        // Initialize empty files for other collections
        writeData('orders', []);
        writeData('reviews', []);

        console.log('\n✅ Local JSON Data initialized successfully!');
        console.log('\n📋 Login credentials:');
        console.log('  Admin:    admin@restaurant.com / admin123');
        console.log('  Cashier:  cashier@restaurant.com / cashier123');
        console.log('  Delivery: delivery@restaurant.com / delivery123');
        console.log('  Customer: john@customer.com / customer123');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();
