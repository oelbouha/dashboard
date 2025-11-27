import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { prisma } from '../lib/db'

async function seed() {
  const agenciesCsv = path.resolve(process.cwd(), '../agencies_agency_rows.csv')
  const contactsCsv = path.resolve(process.cwd(), '../contacts_contact_rows.csv')

  // Agencies: if file exists, attempt to parse minimal fields
  if (fs.existsSync(agenciesCsv)) {
    console.log('Seeding agencies from', agenciesCsv)
    await new Promise<void>((resolve, reject) => {
      const ops: Promise<any>[] = []
      fs.createReadStream(agenciesCsv)
        .pipe(csv())
        .on('data', (row) => {
          const id = row.id || row.agency_id || row.agencyId || undefined
          const name = row.name || row.city || row.agency || 'Unknown'
          ops.push(
            prisma.agency.upsert({
              where: { id: id ?? name },
              update: { name },
              create: { id: id ?? undefined, name },
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

  // Contacts
  if (fs.existsSync(contactsCsv)) {
    console.log('Seeding contacts from', contactsCsv)
    await new Promise<void>((resolve, reject) => {
      const ops: Promise<any>[] = []
      fs.createReadStream(contactsCsv)
        .pipe(csv())
        .on('data', (row) => {
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
                agencyId: row.agency_id || null,
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
                agencyId: row.agency_id || null,
                firmId: row.firm_id || null,
              },
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
