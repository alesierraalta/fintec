'use client';

import React, { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  DollarSign,
  TrendingUp,
  Smartphone,
  Shield,
  Zap,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  Play,
  CheckCircle,
  Globe,
  Clock,
  Target,
  Award,
  Sparkles,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1 },
};

export default function LandingPageClient() {
  const [logoError, setLogoError] = useState(false);

  const features = [
    {
      icon: BarChart3,
      title: 'Gestión Completa',
      description:
        'Administra todas tus cuentas, transacciones y presupuestos desde una sola aplicación',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      icon: Shield,
      title: 'Seguridad Avanzada',
      description:
        'Tus datos están protegidos con encriptación de nivel bancario y autenticación segura',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      icon: Smartphone,
      title: 'Diseño iOS Nativo',
      description:
        'Interfaz elegante y familiar que se siente como una app nativa de iOS',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  ];

  const stats = [
    { label: 'Tasas Actualizadas', value: '24/7', icon: Clock },
    { label: 'Fuentes de Datos', value: '2+', icon: Globe },
    { label: 'Precisión', value: '99.9%', icon: Target },
    { label: 'Tiempo de Respuesta', value: '<1s', icon: Zap },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dynamic-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Navigation */}
        <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/20 bg-background/80 pt-safe-top backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  className="relative h-16 w-auto sm:h-20"
                  style={{ position: 'relative' }}
                >
                  {logoError ? (
                    <div className="flex h-full items-center justify-center text-2xl font-bold text-white">
                      FinTec
                    </div>
                  ) : (
                    <Image
                      src="/finteclogodark.jpg"
                      alt="FinTec Logo"
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 768px) 150px, 200px"
                      loading="eager"
                      onError={(e) => {
                        setLogoError(true);
                      }}
                    />
                  )}
                </div>
              </motion.div>

              <motion.div
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Link href="/auth/login">
                  <button className="rounded-xl bg-primary px-6 py-2 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90">
                    Iniciar Sesión
                  </button>
                </Link>

                <Link href="/auth/register">
                  <button className="rounded-xl border border-border px-6 py-2 font-medium transition-all duration-200 hover:bg-muted/50">
                    Registrarse
                  </button>
                </Link>
              </motion.div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-16 text-center"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.h1
                variants={fadeInUp}
                className="mb-6 text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
              >
                Controla tus Finanzas con
                <span className="block bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Tasas Actualizadas
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-muted-foreground"
              >
                La aplicación financiera más completa de Venezuela. Accede a
                tasas oficiales del BCV, precios P2P de Binance y gestiona todas
                tus finanzas en un solo lugar.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                className="flex flex-col items-center justify-center gap-4 sm:flex-row"
              >
                <Link href="/auth/register">
                  <button className="group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-primary to-blue-500 px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
                    <span>Comenzar Gratis</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>

                <button className="flex items-center space-x-2 rounded-xl border border-border px-8 py-4 text-lg font-semibold transition-all duration-200 hover:bg-muted/50">
                  <Play className="h-5 w-5" />
                  <span>Ver Demo</span>
                </button>
              </motion.div>
            </motion.div>

            {/* Live Rates Preview */}
            <motion.div
              className="mx-auto max-w-7xl"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <div className="rounded-3xl border border-border/20 bg-card/50 p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:p-10">
                <div className="mb-8 text-center">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    Tasas en Vivo
                  </h3>
                  <p className="text-muted-foreground">
                    Datos actualizados en tiempo real
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 xl:gap-10">
                  <BCVRates />
                  <BinanceRatesComponent />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-muted/20 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="grid grid-cols-2 gap-8 lg:grid-cols-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <motion.div
                    key={index}
                    variants={scaleIn}
                    className="text-center"
                  >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <IconComponent className="h-8 w-8 text-primary" />
                    </div>
                    <div className="mb-2 text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
                Todo lo que necesitas para tus finanzas
              </h2>
              <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
                Herramientas profesionales diseñadas para el mercado venezolano
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 gap-8 md:grid-cols-2"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <motion.div
                    key={index}
                    variants={fadeInUp}
                    className={`${feature.bgColor} ${feature.borderColor} group rounded-3xl border p-8 transition-all duration-300 hover:shadow-xl`}
                  >
                    <div
                      className={`h-16 w-16 ${feature.bgColor} mb-6 flex items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110`}
                    >
                      <IconComponent className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <h3 className="mb-4 text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="mb-6 text-3xl font-bold text-foreground sm:text-4xl">
                ¿Listo para tomar control de tus finanzas?
              </h2>
              <p className="mb-8 text-xl text-muted-foreground">
                Únete a miles de usuarios que ya confían en FinTec
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/register">
                  <button className="group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-primary to-blue-500 px-10 py-4 text-lg font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-primary/20">
                    <span>Crear Cuenta Gratis</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </Link>

                <Link href="/auth/login">
                  <button className="rounded-xl border border-border px-10 py-4 text-lg font-semibold transition-all duration-200 hover:bg-muted/50">
                    Ya tengo cuenta
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/20 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-between md:flex-row">
              <div className="mb-4 flex items-center md:mb-0">
                <div
                  className="relative h-32 w-auto"
                  style={{ position: 'relative' }}
                >
                  {logoError ? (
                    <div className="flex h-full items-center justify-center text-3xl font-bold text-white">
                      FinTec
                    </div>
                  ) : (
                    <Image
                      src="/finteclogodark.jpg"
                      alt="FinTec Logo"
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 768px) 200px, 300px"
                      onError={(e) => {
                        setLogoError(true);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="text-center text-muted-foreground md:text-right">
                <div className="mb-3 flex flex-col items-center justify-center gap-4 md:flex-row md:items-end md:justify-end md:gap-6">
                  <Link
                    href="/terms"
                    className="text-sm transition-colors hover:text-foreground"
                  >
                    Términos de Servicio
                  </Link>
                  <span className="hidden text-muted-foreground/50 md:inline">
                    •
                  </span>
                  <Link
                    href="/privacy"
                    className="text-sm transition-colors hover:text-foreground"
                  >
                    Política de Privacidad
                  </Link>
                </div>
                <p>&copy; 2024 FinTec. Todos los derechos reservados.</p>
                <p className="mt-1 text-sm">
                  Tasas actualizadas en tiempo real desde fuentes oficiales
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
