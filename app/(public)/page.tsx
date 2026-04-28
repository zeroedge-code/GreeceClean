import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            Κρατήστε την Ελλάδα <span className="text-action-300">Καθαρή</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Φωτογραφίστε παράνομες χωματερές και σκουπίδια. Τα αναφέρουμε αυτόματα στον
            αρμόδιο δήμο.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/map" className="btn-action text-center">
              Δες τον Χάρτη
            </Link>
            <Link href="/report" className="btn-primary bg-white text-primary hover:bg-gray-100 text-center">
              Κάνε Αναφορά
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            Πώς λειτουργεί
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Φωτογράφισε',
                desc: 'Τράβα φωτογραφία του προβλήματος μέσα από την εφαρμογή.',
              },
              {
                step: '02',
                title: 'Στείλε Αναφορά',
                desc: 'Η τοποθεσία καταγράφεται αυτόματα και η αναφορά αποστέλλεται.',
              },
              {
                step: '03',
                title: 'Παρακολούθησε',
                desc: 'Λαμβάνεις link παρακολούθησης για να δεις την πρόοδο.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="card text-center">
                <div className="text-4xl font-extrabold text-action mb-3">{step}</div>
                <h3 className="text-xl font-semibold text-primary mb-2">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats placeholder */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: '0', label: 'Αναφορές' },
            { value: '0', label: 'Επιλύθηκαν' },
            { value: '0', label: 'Δήμοι' },
            { value: '0', label: 'Χρήστες' },
          ].map(({ value, label }) => (
            <div key={label} className="card">
              <div className="text-3xl font-extrabold text-primary">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
