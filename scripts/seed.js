require('dotenv/config')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const { PrismaClient } = require('@prisma/client')

// Initialize Prisma Client - Prisma 7 uses config from prisma.config.ts
const prisma = new PrismaClient()

async function seed() {
  const agenciesCsv = path.resolve(process.cwd(), '../agencies_agency_rows.csv')
  const contactsCsv = path.resolve(process.cwd(), '../contacts_contact_rows.csv')

  if (fs.existsSync(agenciesCsv)) {
    console.log('Seeding agencies from', agenciesCsv)
    await new Promise((resolve, reject) => {
      const ops = []
      fs.createReadStream(agenciesCsv)
        .pipe(csv())
        .on('data', (row) => {
          const id = row.id || row.agency_id || row.agencyId
          const name = row.name || row.city || row.agency || 'Unknown'
          const agencyData = {
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
          }
          ops.push(
            prisma.agency.upsert({
              where: { id: id || name },
              update: agencyData,
              create: { id: id || undefined, ...agencyData },
            })
          )
        })
        .on('end', async () => {
          await Promise.allSettled(ops)
          resolve()
        })
        .on('error', reject)
    })
  } else {
    console.warn('Agencies CSV not found, skipping agencies seed')
  }

  if (fs.existsSync(contactsCsv)) {
    console.log('Seeding contacts from', contactsCsv)
    
    // Get all agency IDs first
    const agencies = await prisma.agency.findMany({ select: { id: true } })
    const agencyIds = new Set(agencies.map(a => a.id))
    console.log(`Found ${agencyIds.size} agencies in database`)
    
    await new Promise((resolve, reject) => {
      const ops = []
      fs.createReadStream(contactsCsv)
        .pipe(csv())
        .on('data', (row) => {
          // Only include agencyId if it exists in the database
          const agencyId = row.agency_id && agencyIds.has(row.agency_id) ? row.agency_id : null
          
          ops.push(
            prisma.contact.upsert({
              where: { id: row.id },
              update: {
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
              },
              create: {
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
              },
            })
          )
        })
        .on('end', async () => {
          console.log(`Processing ${ops.length} contacts...`)
          const results = await Promise.allSettled(ops)
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failed = results.filter(r => r.status === 'rejected').length
          console.log(`Contacts: ${successful} successful, ${failed} failed`)
          if (failed > 0) {
            console.log('First error:', results.find(r => r.status === 'rejected')?.reason)
          }
          resolve()
        })
        .on('error', reject)
    })
  } else {
    console.warn('Contacts CSV not found, skipping contacts seed')
  }

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
