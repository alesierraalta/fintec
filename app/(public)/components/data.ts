/**
 * Static data for the landing page.
 * All content here is verifiable or clearly marked as placeholder.
 */

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Navigation links
export const navLinks: NavLink[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Descargar', href: '/download' },
  { label: 'Iniciar Sesión', href: '/auth/login' },
  { label: 'Registrarse', href: '/auth/register' },
];

// Testimonials — REMOVED for honesty (2025-08-25): no verified user feedback yet.
// Previously contained fabricated early-access quotes. Section disabled until real feedback exists.
// Keep type for potential future use.
export const testimonials: Testimonial[] = [];

// FAQ items
export const faqItems: FAQItem[] = [
  {
    question: '¿Qué es FinTec?',
    answer:
      'FinTec es una aplicación de finanzas personales (en beta) diseñada para el mercado venezolano. Te permite gestionar cuentas, transacciones, presupuestos y más, con tasas de cambio del BCV y Binance P2P actualizadas automáticamente.',
  },
  {
    question: '¿FinTec es gratuito?',
    answer:
      'Sí, FinTec ofrece un plan gratuito con funcionalidades esenciales. También contamos con un plan Premium con características avanzadas para usuarios que necesitan más herramientas de gestión financiera.',
  },
  {
    question: '¿Cómo se actualizan las tasas de cambio?',
    answer:
      'Las tasas del BCV se obtienen directamente de la fuente oficial del Banco Central de Venezuela. Las tasas de Binance se obtienen del mercado P2P. Ambas se actualizan automáticamente para que siempre tengas la información más reciente.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer:
      'Sí. Usamos cifrado TLS en tránsito, RLS de Supabase y encriptación en reposo. La autenticación es segura y tu privacidad es prioritaria. Producto en beta: seguimos mejorando continuamente.',
  },
  {
    question: '¿En qué dispositivos puedo usar FinTec?',
    answer:
      'Hoy como aplicación web accesible desde cualquier navegador (móvil y escritorio). Estamos trabajando en apps nativas para iOS/Android vía Capacitor, actualmente en beta.',
  },
  {
    question: '¿Puedo gestionar múltiples cuentas?',
    answer:
      'Sí, puedes crear y gestionar múltiples cuentas en diferentes monedas (bolívares, dólares, euros, etc.) y realizar transferencias entre ellas.',
  },
];

// Footer navigation columns
export const footerColumns: FooterColumn[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Características', href: '/#caracteristicas' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Tasas en Vivo', href: '/#tasas-en-vivo' },
      { label: 'Descargar APK (Beta Android)', href: '/download' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre FinTec', href: '/' },
      { label: 'Contacto', href: '/auth/register' },
      { label: 'Waitlist', href: '/waitlist' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de Servicio', href: '/terms' },
      { label: 'Política de Privacidad', href: '/privacy' },
    ],
  },
];

// Social links — disabled for honesty (2025-08-25): no verified public profiles yet.
// Previous links (x.com/fintec etc.) were placeholders. Add real URLs when available.
export const socialLinks: { label: string; href: string; icon: string }[] = [];

// Features
export const features: FeatureItem[] = [
  {
    icon: 'BarChart3',
    title: 'Gestión Completa',
    description:
      'Administra todas tus cuentas, transacciones y presupuestos desde una sola aplicación',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    icon: 'Shield',
    title: 'Seguridad Avanzada',
    description:
      'Cifrado en tránsito (TLS), RLS en base de datos y autenticación segura',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
  {
    icon: 'Smartphone',
    title: 'Diseño Moderno',
    description:
      'Interfaz limpia y adaptable inspirada en apps nativas — funciona en móvil y escritorio',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    icon: 'Zap',
    title: 'Tasas en Tiempo Real',
    description:
      'Accede a tasas del BCV y Binance P2P actualizadas automáticamente 24/7',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
];
