import Topbar from '../Topbar.jsx'
import UpcomingFeature from '../UpcomingFeature.jsx'

export default function TalentDevelopment() {
  return (
    <div>
      <Topbar icon="barChart" title="Talent Development" />
      <div className="content">
        <UpcomingFeature
          description={
            <>
              Fitur ini akan menyusun <strong>rencana program pengembangan</strong> berdasarkan aspek kompetensi
              yang diukur di Soft CLI &amp; Hard CLI — menampilkan berapa banyak karyawan yang dinilai pada tiap
              aspek kompetensi dan berapa yang bernilai benar, dengan filter berdasarkan{' '}
              <strong>Level Jabatan</strong>, sehingga bisa disusun program pengembangan yang tepat sasaran untuk
              aspek-aspek yang belum tercapai. Sedang dalam tahap pengembangan.
            </>
          }
        />
      </div>
    </div>
  )
}
