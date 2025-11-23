// --- START OF FILE server.js (PHIÊN BẢN FIX LỖI ĐƯỜNG DẪN & VIP) ---

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Đường dẫn lưu ảnh upload
const UPLOADS_DIR = path.join(__dirname, 'public/uploads'); 

// Cache tỉ lệ game để tránh query nhiều
let lobbyRatesCache = {};
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// CẤU HÌNH VIP: 3 Triệu VNĐ
const VIP_THRESHOLD = 3000000; 

// Danh sách các nhà cái
const gameBrands = [ 
    { name: 'AU88', logo: 'au88.png' }, { name: 'MB66', logo: 'mb66.png' }, 
    { name: 'MM88', logo: 'mm88.png' }, { name: 'RR88', logo: 'rr88.png' }, 
    { name: 'XX88', logo: 'xx88.png' }, { name: 'QH88', logo: 'qh88.png' }, 
    { name: 'F8BET', logo: 'f8bet.png' }, { name: 'SHBET', logo: 'shbet.png' }, 
    { name: '188BET', logo: '188bet.png' }, { name: 'FLY88', logo: 'fly88.png' }, 
    { name: 'QQ88', logo: 'qq88.png' }, { name: 'U888', logo: 'u888.png' }, 
    { name: 'BL555', logo: 'bl555.png' }, { name: '8KBET', logo: '8kbet.png' } 
];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// === QUAN TRỌNG: CẤU HÌNH ĐƯỜNG DẪN TĨNH (SỬA LỖI KHÔNG VÀO ĐƯỢC WEB) ===
// 1. Phục vụ các file trong thư mục public (css, js, images)
app.use(express.static(path.join(__dirname, 'public')));
// 2. Phục vụ các file ở thư mục gốc (html files)
app.use(express.static(__dirname));
// 3. Đường dẫn riêng cho uploads
app.use('/uploads', express.static(UPLOADS_DIR));


// Cấu hình Multer để upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(UPLOADS_DIR)){ fs.mkdirSync(UPLOADS_DIR, { recursive: true }); }
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => { 
        console.log('Connected to the MongoDB database.'); 
        createSuperAdmin();
        migrateOrphanedSubAdmins();
        migrateLobbyCategories();
    })
    .catch(err => console.error('Could not connect to MongoDB...', err));

// --- CÁC SCHEMA (Đã thêm total_deposit) ---
const userSchema = new mongoose.Schema({ 
    username: { type: String, required: true, unique: true, trim: true }, 
    password: { type: String, required: true }, 
    coins: { type: Number, default: 0 }, 
    total_deposit: { type: Number, default: 0 }, // Trường mới cho VIP
    is_admin: { type: Boolean, default: false }, 
    is_super_admin: { type: Boolean, default: false }, 
    managed_by_admin_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    assigned_brand: { type: String, default: null }, 
    coins_by_brand: { type: Map, of: Number, default: {} }, 
    created_by_super_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } 
}, { timestamps: true });

const lobbySchema = new mongoose.Schema({ name: String, logo_url: String, position: { type: Number, default: 0 }, category: { type: String, enum: ['nohu', 'banca'], default: 'nohu' } });
const gameSchema = new mongoose.Schema({ lobby_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lobby', required: true }, name: String, image_url: String });

const User = mongoose.model('User', userSchema);
const Lobby = mongoose.model('Lobby', lobbySchema);
const Game = mongoose.model('Game', gameSchema);

// --- CÁC HÀM HỆ THỐNG ---
async function createSuperAdmin() { const superAdmins = [ { username: 'longho', password: '173204' }, { username: 'vylaobum4', password: '0354089235' } ]; try { for (const admin of superAdmins) { const existingAdmin = await User.findOne({ username: admin.username }); if (!existingAdmin) { const hashedPassword = await bcrypt.hash(admin.password, 10); await new User({ username: admin.username, password: hashedPassword, is_admin: true, is_super_admin: true }).save(); console.log(`Super Admin created: ${admin.username}`); } } } catch (error) { console.error(`Error creating Super Admin:`, error.message); } }
async function migrateOrphanedSubAdmins() { try { const originalSuperAdmin = await User.findOne({ username: 'longho', is_super_admin: true }); if (!originalSuperAdmin) return; await User.updateMany( { is_admin: true, is_super_admin: false, created_by_super_admin_id: null }, { $set: { created_by_super_admin_id: originalSuperAdmin._id } } ); } catch (error) { console.error("Migration error:", error.message); } }
async function migrateLobbyCategories() { try { await Lobby.updateMany({ category: { $exists: false } }, { $set: { category: 'nohu' } }); } catch (error) { console.error("Lobby migration error:", error.message); } }

// ============================================
// === CÁC API ENDPOINTS ===
// ============================================

// 1. Đăng ký & Đăng nhập
app.post('/api/register', async (req, res) => { try { const { username, password } = req.body; if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin' }); if (username.length <= 4) return res.status(400).json({ success: false, message: 'Tên đăng nhập > 4 ký tự' }); if (password.length <= 6) return res.status(400).json({ success: false, message: 'Mật khẩu > 6 ký tự' }); const existingUser = await User.findOne({ username }); if (existingUser) return res.status(409).json({ success: false, message: 'Tên đã tồn tại' }); const hashedPassword = await bcrypt.hash(password, 10); await new User({ username, password: hashedPassword }).save(); res.json({ success: true, message: 'Đăng ký thành công!' }); } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server' }); } });
app.post('/api/login', async (req, res) => { try { const { username, password } = req.body; const user = await User.findOne({ username }); if (!user) return res.status(404).json({ success: false, message: 'Sai tên đăng nhập' }); const isMatch = await bcrypt.compare(password, user.password); if (isMatch) { res.json({ success: true, message: 'Thành công', isAdmin: user.is_admin, isSuperAdmin: user.is_super_admin, userId: user.is_admin ? user._id : null }); } else { res.status(401).json({ success: false, message: 'Sai mật khẩu' }); } } catch (error) { res.status(500).json({ success: false, message: 'Lỗi server' }); } });

// 2. Lấy thông tin User (Kèm logic VIP)
app.get('/api/user-info', async (req, res) => { 
    try { 
        const { username } = req.query; 
        const user = await User.findOne({ username }).select('username coins coins_by_brand assigned_brand total_deposit'); 
        if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy user" }); 
        
        // Logic VIP
        const currentDeposit = user.total_deposit || 0;
        const isVip = currentDeposit >= VIP_THRESHOLD;
        const progressPercent = Math.min(100, (currentDeposit / VIP_THRESHOLD) * 100);

        res.json({ 
            success: true, 
            userInfo: user,
            vipData: {
                isVip,
                currentDeposit,
                threshold: VIP_THRESHOLD,
                progressPercent
            }
        }); 
    } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } 
});

// 3. Admin lấy danh sách User
app.get('/api/users', async (req, res) => { 
    try { 
        const { admin_id } = req.query; 
        if (!admin_id) return res.status(400).json({ success: false, message: "Thiếu admin info" }); 
        const users = await User.find({ managed_by_admin_ids: admin_id }).select('_id username coins_by_brand total_deposit'); 
        res.json({ success: true, users }); 
    } catch (error) { res.status(500).json({ success: false, message: "Lỗi server" }); } 
});

// 4. Admin Nạp tiền tích lũy (VIP)
// --- CẬP NHẬT API: NẠP/THU HỒI TIỀN TÍCH LŨY (VIP) ---
app.post('/api/add-deposit-amount', async (req, res) => {
    try {
        const { userId, amount, adminId } = req.body;
        const depositAmount = parseInt(amount, 10);
        
        // Sửa điều kiện: Cho phép số âm, chỉ chặn số 0 hoặc không phải số
        if (!userId || !adminId || isNaN(depositAmount) || depositAmount === 0) {
            return res.status(400).json({ success: false, message: "Số tiền không hợp lệ." });
        }
        
        const admin = await User.findById(adminId);
        if (!admin || (!admin.is_admin && !admin.is_super_admin)) {
            return res.status(403).json({ success: false, message: "Không có quyền." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User không tồn tại." });

        // Tính toán mới: Nếu trừ tiền thì không được để tổng âm
        let newTotal = (user.total_deposit || 0) + depositAmount;
        if (newTotal < 0) newTotal = 0;

        user.total_deposit = newTotal;
        await user.save();

        const actionText = depositAmount > 0 ? "Cộng" : "Thu hồi";
        res.json({ 
            success: true, 
            message: `Đã ${actionText} ${Math.abs(depositAmount).toLocaleString()}đ tích lũy cho ${user.username}`, 
            newTotal: user.total_deposit 
        });
    } catch (error) { 
        res.status(500).json({ success: false, message: "Lỗi server." }); 
    }
});
// 5. Các API Quản lý Sảnh & Game
app.get('/api/brands', (req, res) => { res.json({ success: true, brands: gameBrands }); });
app.get('/api/brands-with-rates', async (req, res) => { try { const { username } = req.query; if (!username) { return res.status(400).json({ success: false, message: "Thiếu tên người dùng." }); } const user = await User.findOne({ username }).populate('managed_by_admin_ids', 'assigned_brand'); if (!user) { return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." }); } const priorityBrand = user.managed_by_admin_ids.map(admin => admin.assigned_brand).find(brand => brand); let brandsWithRates; if (priorityBrand) { brandsWithRates = gameBrands.map(brand => (brand.name === priorityBrand ? { ...brand, percentage: Math.floor(Math.random() * 8) + 91 } : { ...brand, percentage: Math.floor(Math.random() * 20) + 50 })); brandsWithRates.sort((a, b) => { if (a.name === priorityBrand) return -1; if (b.name === priorityBrand) return 1; return 0; }); } else { brandsWithRates = gameBrands.map(brand => ({ ...brand, percentage: Math.floor(Math.random() * 20) + 70 })); } res.json({ success: true, brands: brandsWithRates, priorityBrand: priorityBrand || null }); } catch (error) { console.error("Lỗi khi lấy sảnh với tỷ lệ:", error); res.status(500).json({ success: false, message: "Lỗi server." }); } });

app.post('/api/add-lobby', upload.single('logo'), async (req, res) => { try { const { name, category } = req.body; await new Lobby({ name, logo_url: `/uploads/${req.file.filename}`, category }).save(); res.json({ success: true, message: "Thêm sảnh thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/update-lobby', upload.single('logo'), async (req, res) => { try { const { lobby_id } = req.body; await Lobby.updateOne({ _id: lobby_id }, { logo_url: `/uploads/${req.file.filename}` }); res.json({ success: true, message: "Sửa logo thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/update-lobby-order', async (req, res) => { try { const { orderedIds } = req.body; const updates = orderedIds.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { position: index } } } })); await Lobby.bulkWrite(updates); res.json({ success: true, message: "Lưu thứ tự thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.get('/api/lobbies', async (req, res) => { try { const { category } = req.query; const filter = category ? { category } : {}; const lobbies = await Lobby.find(filter).sort({ position: 1, _id: 1 }); res.json({ success: true, lobbies }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });

app.post('/api/add-game', upload.single('image'), async (req, res) => { try { const { lobby_id, name } = req.body; await new Game({ lobby_id, name, image_url: `/uploads/${req.file.filename}` }).save(); delete lobbyRatesCache[lobby_id]; res.json({ success: true, message: "Thêm game thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/update-game', upload.single('image'), async (req, res) => { try { const { game_id } = req.body; const game = await Game.findById(game_id); await Game.updateOne({ _id: game_id }, { image_url: `/uploads/${req.file.filename}` }); delete lobbyRatesCache[game.lobby_id]; res.json({ success: true, message: "Sửa ảnh game thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.get('/api/games', async (req, res) => { try { const { lobby_id } = req.query; const games = await Game.find({ lobby_id }); res.json({ success: true, games }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.get('/api/games-with-rates', async (req, res) => { try { const { lobby_id } = req.query; const now = Date.now(); const cached = lobbyRatesCache[lobby_id]; if (cached && (now - cached.timestamp < ONE_HOUR_IN_MS)) return res.json({ success: true, games: cached.games }); const games = await Game.find({ lobby_id }).lean(); if (games.length) { let gRates = games.map(g => ({ ...g, winRate: Math.floor(Math.random() * 76) + 10 })); const boostCount = Math.min(games.length, Math.floor(Math.random() * 4) + 2); const indices = [...Array(games.length).keys()].sort(() => 0.5 - Math.random()); for (let i = 0; i < boostCount; i++) gRates[indices[i]].winRate = Math.floor(Math.random() * 10) + 86; lobbyRatesCache[lobby_id] = { timestamp: now, games: gRates }; res.json({ success: true, games: gRates }); } else { res.json({ success: true, games: [] }); } } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });

// 6. Các API Hỗ trợ Admin & Token
app.post('/api/link-user', async (req, res) => { try { const { adminId, username } = req.body; if (!adminId || !username) return res.status(400).json({ success: false, message: "Nhập username." }); const user = await User.findOne({ username, is_admin: false }); if (!user) return res.status(404).json({ success: false, message: `User "${username}" không tồn tại.` }); if (user.managed_by_admin_ids.includes(adminId)) return res.status(409).json({ success: false, message: "Đã quản lý user này." }); await User.updateOne({ _id: user._id }, { $push: { managed_by_admin_ids: adminId } }); res.json({ success: true, message: "Thêm thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/delete-user', async (req, res) => { try { const { userId, adminId } = req.body; await User.updateOne({ _id: userId }, { $pull: { managed_by_admin_ids: adminId } }); res.json({ success: true, message: "Đã xóa user." }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/add-coins-to-user', async (req, res) => { try { const { userId, amount, adminId } = req.body; const nAmount = parseInt(amount, 10); if (!adminId || !userId || isNaN(nAmount) || nAmount === 0) return res.status(400).json({ success: false, message: "Lỗi dữ liệu." }); const admin = await User.findById(adminId); const user = await User.findById(userId); if (!admin || !user) return res.status(404).json({ success: false, message: "Không tìm thấy user/admin." }); const brand = admin.assigned_brand; if (!admin.is_super_admin && !brand) return res.status(403).json({ success: false, message: "Admin chưa gán sảnh." }); if (!admin.is_super_admin && nAmount > 0 && admin.coins < nAmount) return res.status(400).json({ success: false, message: `Admin không đủ token (Còn: ${admin.coins}).` }); const cur = user.coins_by_brand.get(brand) || 0; const next = cur + nAmount; if (next < 0) return res.status(400).json({ success: false, message: "Không thể trừ âm token." }); if (!admin.is_super_admin) { admin.coins -= nAmount; await admin.save(); } user.coins_by_brand.set(brand, next); await user.save(); res.json({ success: true, message: "Thành công!", newTotal: next }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/revoke-all-coins-from-user', async (req, res) => { try { const { userId, adminId } = req.body; const [admin, user] = await Promise.all([ User.findById(adminId), User.findById(userId) ]); if (!admin || !user) return res.status(404).json({ success: false, message: "Lỗi dữ liệu." }); const brand = admin.assigned_brand; const current = user.coins_by_brand.get(brand) || 0; if (current === 0) return res.status(400).json({ success: false, message: "User không có token." }); if (!admin.is_super_admin) admin.coins += current; user.coins_by_brand.set(brand, 0); await Promise.all([admin.save(), user.save()]); res.json({ success: true, message: "Thu hồi thành công." }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.get('/api/sub-admins', async (req, res) => { try { const { creator_id } = req.query; const admins = await User.find({ is_admin: true, is_super_admin: false, created_by_super_admin_id: creator_id }); res.json({ success: true, admins }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/create-sub-admin', async (req, res) => { try { const { username, password, brandName, creatorId } = req.body; const exists = await User.findOne({ username }); if (exists) return res.status(409).json({ success: false, message: "Tên đã tồn tại." }); const hashedPassword = await bcrypt.hash(password, 10); await new User({ username, password: hashedPassword, is_admin: true, assigned_brand: brandName, created_by_super_admin_id: creatorId }).save(); res.json({ success: true, message: "Tạo thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/grant-coins-to-admin', async (req, res) => { try { const { adminId, amount } = req.body; const u = await User.findById(adminId); u.coins += parseInt(amount); await u.save(); res.json({ success: true, message: "Cấp thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/revoke-coins-from-admin', async (req, res) => { try { const { adminId, amount } = req.body; const u = await User.findById(adminId); u.coins = Math.max(0, u.coins - parseInt(amount)); await u.save(); res.json({ success: true, message: "Thu hồi thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/delete-sub-admin', async (req, res) => { try { const { adminId } = req.body; await User.deleteOne({ _id: adminId }); await User.updateMany({ managed_by_admin_ids: adminId }, { $pull: { managed_by_admin_ids: adminId } }); res.json({ success: true, message: "Xóa thành công!" }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });

// 7. Các API Logic Hack
app.post('/api/analyze-game', async (req, res) => { try { const { username, winRate, brandName } = req.body; const user = await User.findOne({ username }); const cur = user.coins_by_brand.get(brandName) || 0; if (cur < 10) return res.json({ success: false, message: "Không đủ 10 Token.", outOfTokens: true }); user.coins_by_brand.set(brandName, cur - 10); await user.save(); const base = parseInt(winRate); const result = Math.min(98, Math.floor(Math.random() * (99 - base)) + base); res.json({ success: true, message: "HACK thành công!", newCoinBalance: cur - 10, analysisResult: result }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/analyze-special-game', async (req, res) => { try { const { username, brandName, cost } = req.body; const costNum = parseInt(cost); const user = await User.findOne({ username }); const cur = user.coins_by_brand.get(brandName) || 0; if (cur < costNum) return res.json({ success: false, message: `Cần ${costNum} Token.`, outOfTokens: true }); user.coins_by_brand.set(brandName, cur - costNum); await user.save(); res.json({ success: true, message: "HACK thành công!", newCoinBalance: cur - costNum }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });
app.post('/api/deduct-recurring-token', async (req, res) => { try { const { username, brandName } = req.body; const user = await User.findOne({ username }); const cur = user.coins_by_brand.get(brandName) || 0; if (cur < 10) return res.json({ success: false, message: "Hết Token.", outOfTokens: true }); user.coins_by_brand.set(brandName, cur - 10); await user.save(); res.json({ success: true, message: "Đã trừ 10 Token.", newCoinBalance: cur - 10 }); } catch (error) { res.status(500).json({ success: false, message: "Lỗi server." }); } });

// Route mặc định cho root để load index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// === SỬA DÒNG NÀY ĐỂ HIỆN LINK CLICK ĐƯỢC TRONG TERMINAL ===
app.listen(port, () => {
    console.log(`---------------------------------------------`);
    console.log(`Server is running on: http://localhost:${port}`); // <--- Bấm Ctrl + Click vào đây
    console.log(`---------------------------------------------`);
});