// scripts/seed-tenant.mjs
// Tenant Customer kaydını ve admin kullanıcısını Supabase'e ekler
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env dosyasını oku
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const tenantName = env.TENANT_NAME || 'VibeGSM';
const adminEmail = env.DEMO_LOGIN_EMAIL || 'admin@vibegsm.local';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log(`[seed-tenant] Tenant: "${tenantName}", Admin: "${adminEmail}"`);

  // 1. Tenant Customer kontrolü/oluşturma
  const { data: existingTenant, error: findErr } = await supabase
    .from('Customer')
    .select('id, fullName, email')
    .eq('fullName', tenantName)
    .maybeSingle();

  if (findErr) {
    console.error('[seed-tenant] Tenant arama hatası:', findErr.message);
    process.exit(1);
  }

  let tenantId;
  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`[seed-tenant] ✅ Tenant zaten mevcut: id=${tenantId}`);
  } else {
    const tenantMeta = {
      isSaaS: true, plan: 'Pro', branchLimit: 5, databaseSizeGb: 1.0,
      smsQuota: 5000, smsUsed: 0, leadStatus: 'WON',
      modules: { pos: true, repairs: true, stock: true, buyback: false, invoicing: true },
      rolePermissions: {
        PLATFORM_OWNER: ['pos','repairs','stock','invoicing','buyback'],
        ADMIN: ['pos','repairs','stock','invoicing','buyback'],
        MANAGER: ['pos','repairs','stock','invoicing'],
        CASHIER: ['pos'], TECHNICIAN: ['repairs'], ACCOUNTANT: ['invoicing'],
      },
      tickets: [], billingLedger: [],
    };

    const { data: created, error: createErr } = await supabase
      .from('Customer')
      .insert({
        fullName: tenantName,
        phone: '5550000001',
        email: adminEmail,
        notes: JSON.stringify(tenantMeta),
        creditLimit: 0,
      })
      .select('id')
      .single();

    if (createErr) {
      console.error('[seed-tenant] Tenant oluşturma hatası:', createErr.message);
      process.exit(1);
    }
    tenantId = created.id;
    console.log(`[seed-tenant] ✅ Tenant oluşturuldu: id=${tenantId}`);
  }

  // 2. Admin kullanıcısını tenant ile eşleştir
  const { data: adminUser, error: adminFindErr } = await supabase
    .from('AppUser')
    .select('id, email, tenantId')
    .eq('email', adminEmail.toLowerCase())
    .maybeSingle();

  if (adminFindErr) {
    console.error('[seed-tenant] Admin kullanıcı arama hatası:', adminFindErr.message);
    process.exit(1);
  }

  if (!adminUser) {
    console.log('[seed-tenant] ⚠️ Admin kullanıcı bulunamadı. İlk girişte otomatik oluşturulacak.');
  } else if (adminUser.tenantId !== tenantId) {
    const { error: updateErr } = await supabase
      .from('AppUser')
      .update({ tenantId })
      .eq('id', adminUser.id);

    if (updateErr) {
      console.error('[seed-tenant] Admin tenantId güncelleme hatası:', updateErr.message);
      process.exit(1);
    }
    console.log(`[seed-tenant] ✅ Admin kullanıcı tenant ile eşleştirildi: ${adminEmail} → ${tenantId}`);
  } else {
    console.log(`[seed-tenant] ✅ Admin kullanıcı zaten tenant ile eşleşmiş.`);
  }

  console.log('[seed-tenant] 🎉 Tenant seed tamamlandı!');
}

main().catch((err) => {
  console.error('[seed-tenant] Beklenmeyen hata:', err);
  process.exit(1);
});
