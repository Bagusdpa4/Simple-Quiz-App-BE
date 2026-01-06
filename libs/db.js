const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Ambil URL database dari .env
const connectionString = process.env.DATABASE_URL;

// Inisialisasi pool koneksi PostgreSQL
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Inisialisasi Prisma Client dengan adapter (Wajib di Prisma 7)
const prisma = new PrismaClient({ adapter });

module.exports = prisma;