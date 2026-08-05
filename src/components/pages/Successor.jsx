import Topbar from '../Topbar.jsx'
import UpcomingFeature from '../UpcomingFeature.jsx'

export default function Successor() {
  return (
    <div>
      <Topbar icon="userCheck" title="Talent Match Up" />
      <div className="content">
        <UpcomingFeature description='Fitur ini akan digunakan untuk mencocokkan (match up) antara kandidat suksesor dengan kebutuhan suatu jabatan di masa depan. Sedang dalam tahap pengembangan.' />
      </div>
    </div>
  )
}
