require('dotenv/config')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const { PrismaClient } = require('@prisma/client')

// Initialize Prisma Client
const prisma = new PrismaClient()

// Helper to process in batches to avoid connection pool exhaustion
async function processBatch(items, batchSize, processFn) {
  const results = { successful: 0, failed: 0, errors: [] }
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(batch.map(processFn))
    
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.successful++
      } else {
        results.failed++
        if (results.errors.length < 5) { // Keep first 5 errors
          results.errors.push({ index: i + idx, reason: result.reason.message })
        }
      }
    })
    
    console.log(`  Processed ${Math.min(i + batchSize, items.length)}/${items.length}...`)
  }
  
  return results
}

async function seed() {
  const agenciesCsv = path.resolve(process.cwd(), '../agencies_agency_rows.csv')
  const contactsCsv = path.resolve(process.cwd(), '../contacts_contact_rows.csv')

  // Seed Agencies
  if (fs.existsSync(agenciesCsv)) {
    console.log('Seeding agencies from', agenciesCsv)
    const agencies = []
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(agenciesCsv)
        .pipe(csv())
        .on('data', (row) => {
          const id = row.id || row.agency_id || row.agencyId
          const name = row.name || row.city || row.agency || 'Unknown'
          agencies.push({
            id: id || name,
            name,
            type: row.type || null,
            website: row.website || null,
            address: row.physical_address || row.mailing_address || null,
            city: row.city || null,
            state: row.state || null,
            zip: row.zip || row.zip_code || null,
            phone: row.phone || null,
            email: row.email || null,
            population: row.population ? parseInt(row.population) : null,
            squareMiles: row.square_miles ? parseFloat(row.square_miles) : null,
          })
        })
        .on('end', resolve)
        .on('error', reject)
    })
    
    console.log(`Found ${agencies.length} agencies, importing in batches...`)
    const agencyResults = await processBatch(agencies, 50, async (agencyData) => {
      return prisma.agency.upsert({
        where: { id: agencyData.id },
        update: agencyData,
        create: agencyData,
      })
    })
    
    console.log(`Agencies: ${agencyResults.successful} imported, ${agencyResults.failed} failed`)
    if (agencyResults.errors.length > 0) {
      console.log('Sample errors:', agencyResults.errors)
    }
  } else {
    console.warn('Agencies CSV not found, skipping agencies seed')
  }

  // Seed Contacts
  if (fs.existsSync(contactsCsv)) {
    console.log('Seeding contacts from', contactsCsv)
    
    // Get all agency IDs first
    const agencies = await prisma.agency.findMany({ select: { id: true } })
    const agencyIds = new Set(agencies.map(a => a.id))
    console.log(`Found ${agencyIds.size} agencies in database`)
    
    const contacts = []
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(contactsCsv)
        .pipe(csv())
        .on('data', (row) => {
          // Only include agencyId if it exists in the database
          const agencyId = row.agency_id && agencyIds.has(row.agency_id) ? row.agency_id : null
          
          contacts.push({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email || null,
            phone: row.phone || null,
            title: row.title || null,
            emailType: row.email_type || null,
            contactFormUrl: row.contact_form_url || null,
            department: row.department || null,
            agencyId: agencyId,
            firmId: row.firm_id || null,
          })
        })
        .on('end', resolve)
        .on('error', reject)
    })
    
    console.log(`Found ${contacts.length} contacts, importing in batches...`)
    const contactResults = await processBatch(contacts, 50, async (contactData) => {
      return prisma.contact.upsert({
        where: { id: contactData.id },
        update: contactData,
        create: contactData,
      })
    })
    
    console.log(`Contacts: ${contactResults.successful} imported, ${contactResults.failed} failed`)
    if (contactResults.errors.length > 0) {
      console.log('Sample errors:', contactResults.errors)
    }
  } else {
    console.warn('Contacts CSV not found, skipping contacts seed')
  }

  // Final counts
  const finalAgencyCount = await prisma.agency.count()
  const finalContactCount = await prisma.contact.count()
  console.log('\n=== Seeding Summary ===')
  console.log(`Total agencies in database: ${finalAgencyCount}`)
  console.log(`Total contacts in database: ${finalContactCount}`)
  console.log('Seeding completed')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
