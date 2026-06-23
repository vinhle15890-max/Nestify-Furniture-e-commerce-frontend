/**
 * Home page editorial content.
 *
 * Images are Unsplash CDN placeholders (verified reachable) — swap with real
 * Nestify product/lifestyle photography before launch. Keep the same aspect
 * ratios for a drop-in replacement.
 */

const UNSPLASH = 'https://images.unsplash.com'
export const img = (id, w = 1200) => `${UNSPLASH}/${id}?auto=format&fit=crop&w=${w}&q=80`

export const hero = {
  image: img('photo-1618220179428-22790b461013', 2000),
  eyebrow: 'Nội thất thủ công',
  title: 'Không gian sống mang hơi thở của bạn.',
  subtitle: 'Nội thất bền vững, chế tác từ vật liệu tự nhiên cho cuộc sống hiện đại.',
  primaryCta: { label: 'Khám phá bộ sưu tập', to: '/c/all' },
  secondaryCta: { label: 'Xem Lookbook', to: '#lookbook' },
}

export const categories = [
  { name: 'Sofa', caption: 'Phòng khách', to: '/c/sofa', image: img('photo-1586023492125-27b2c045efd7', 1000) },
  { name: 'Bàn ăn', caption: 'Phòng bếp', to: '/c/ban-an', image: img('photo-1540574163026-643ea20ade25', 1000) },
  { name: 'Đèn trang trí', caption: 'Ánh sáng', to: '/c/den', image: img('photo-1522708323590-d24dbb6b0267', 1000) },
  { name: 'Phòng ngủ', caption: 'Nghỉ ngơi', to: '/c/phong-ngu', image: img('photo-1567225557594-88d73e55f2cb', 1000) },
]

export const collections = [
  {
    name: 'Mộc mạc hiện đại',
    tagline: 'Organic Modern',
    body: 'Đường nét mềm mại, vật liệu thô mộc và bảng màu trung tính tôn vinh vẻ đẹp tự nhiên của từng chất liệu.',
    to: '/c/organic-modern',
    image: img('photo-1493663284031-b7e3aefcae8e', 1400),
  },
  {
    name: 'Sống Japandi',
    tagline: 'Japandi Living',
    body: 'Sự tối giản Nhật Bản gặp gỡ nét ấm áp Bắc Âu — cân bằng, tĩnh tại và đầy chủ đích.',
    to: '/c/japandi',
    image: img('photo-1524758631624-e2822e304c36', 1400),
  },
  {
    name: 'Ấm áp đương đại',
    tagline: 'Contemporary Warmth',
    body: 'Những gam màu đất, kết cấu phong phú và ánh sáng dịu nhẹ cho một tổ ấm thật sự sống.',
    to: '/c/contemporary-warmth',
    image: img('photo-1505693416388-ac5ce068fe85', 1400),
  },
]

export const materials = [
  { name: 'Gỗ sồi', caption: 'Bền vững · vân gỗ tự nhiên', image: img('photo-1531835551805-16d864c8d311', 800) },
  { name: 'Đá travertine', caption: 'Khoáng thạch · bề mặt nguyên bản', image: img('photo-1597072689227-8882273e8f6a', 800) },
  { name: 'Vải lanh', caption: 'Sợi thiên nhiên · mềm thoáng', image: img('photo-1583847268964-b28dc8f51f92', 800) },
  { name: 'Đồng thau', caption: 'Hoàn thiện chải mờ · ấm sang', image: img('photo-1556228453-efd6c1ff04f6', 800) },
]

export const lookbook = [
  { image: img('photo-1567538096630-e0c55bd6374c', 1200), span: 'lg:col-span-7 lg:row-span-2', alt: 'Góc phòng khách ấm cúng' },
  { image: img('photo-1538688525198-9b88f6f53126', 900), span: 'lg:col-span-5', alt: 'Chi tiết ghế và đèn' },
  { image: img('photo-1555041469-a586c61ea9bc', 900), span: 'lg:col-span-5', alt: 'Sofa và bàn trà' },
  { image: img('photo-1550226891-ef816aed4a98', 1200), span: 'lg:col-span-5', alt: 'Không gian ăn uống' },
  { image: img('photo-1503602642458-232111445657', 1200), span: 'lg:col-span-7', alt: 'Phòng ngủ tối giản' },
]

export const brandStory = {
  eyebrow: 'Câu chuyện Nestify',
  title: 'Chế tác để sống cùng năm tháng.',
  paragraphs: [
    'Mỗi món đồ được tạo nên từ vật liệu tự nhiên và đôi bàn tay nghệ nhân.',
    'Chúng tôi tin vào thiết kế vượt thời gian — đẹp hôm nay và bền vững mai sau.',
  ],
  image: img('photo-1567016432779-094069958ea5', 1200),
  cta: { label: 'Về Nestify', to: '/c/all' },
}

export const testimonials = [
  { quote: 'Chất lượng hoàn thiện vượt mong đợi. Căn phòng như được thổi hồn.', author: 'Mai Anh', role: 'Hà Nội' },
  { quote: 'Thiết kế tinh tế, vật liệu thật và bền. Đáng từng đồng.', author: 'Quốc Huy', role: 'TP. Hồ Chí Minh' },
  { quote: 'Trải nghiệm mua sắm cao cấp từ đầu đến cuối.', author: 'Thu Hà', role: 'Đà Nẵng' },
]
