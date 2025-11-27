import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import Navigation from '@/components/Navigation'
import UpgradePrompt from '@/components/UpgradePrompt'

function todayKey() {
  const d = new Date()
  return d.toISOString().slice(0,10)
}

export default async function ContactsPage() {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // enforce daily limit
  const key = todayKey()
  const record = await prisma.userContactView.upsert({
    where: { userId_viewDate: { userId, viewDate: key } },
    update: {},
    create: { userId, viewDate: key, viewCount: 0 },
  })

  const remainingViews = 50 - record.viewCount
  
  if (remainingViews <= 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <UpgradePrompt />
      </div>
    )
  }

  // Get total count of contacts with meaningful data (email or phone)
  const totalContacts = await prisma.contact.count({
    where: {
      OR: [
        { email: { not: null } },
        { phone: { not: null } },
      ],
    },
  })

  // Fetch only as many contacts as the user has views remaining
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: { not: null } },
        { phone: { not: null } },
      ],
    },
    orderBy: { lastName: 'asc' },
    take: remainingViews,
  })

  // Increment view count by the number of contacts being displayed
  await prisma.userContactView.update({
    where: { userId_viewDate: { userId, viewDate: key } },
    data: { viewCount: { increment: contacts.length } },
  })
  
  const viewedToday = record.viewCount + contacts.length
  const remaining = 50 - viewedToday
  const hasMore = totalContacts > viewedToday

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-gray-600">
              Showing {contacts.length} of {totalContacts.toLocaleString()} contacts
            </p>
            <div className="text-sm">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {remaining} views remaining today
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </td>
                    {(contact.title) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.title}
                      </td>
                    )}
                    {!contact.title && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">N/A</td>}
                    {contact.email ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">N/A</td>
                    )}
                    {contact.phone ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.phone}
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">N/A</td>
                    )}
                    {contact.department ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.department}
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">N/A</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasMore && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {(totalContacts - viewedToday).toLocaleString()} more contacts available
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    You've viewed {viewedToday} of {totalContacts.toLocaleString()} total contacts
                  </p>
                </div>
              </div>
              {remaining > 0 ? (
                <button 
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Load More ({Math.min(remaining, totalContacts - contacts.length)})
                </button>
              ) : (
                <button 
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                >
                  Daily Limit Reached
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
