'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  RefreshCw
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1 }
};

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: BarChart3,
      title: "Gestión Completa",
      description: "Administra todas tus cuentas, transacciones y presupuestos desde una sola aplicación",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20"
    },
    {
      icon: Shield,
      title: "Seguridad Avanzada",
      description: "Tus datos están protegidos con encriptación de nivel bancario y autenticación segura",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20"
    },
    {
      icon: Smartphone,
      title: "Diseño iOS Nativo",
      description: "Interfaz elegante y familiar que se siente como una app nativa de iOS",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20"
    }
  ];

  const stats = [
    { label: "Tasas Actualizadas", value: "24/7", icon: Clock },
    { label: "Fuentes de Datos", value: "2+", icon: Globe },
    { label: "Precisión", value: "99.9%", icon: Target },
    { label: "Tiempo de Respuesta", value: "<1s", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              className="flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative w-24 h-24">
                {logoError ? (
                  <div className="flex items-center justify-center h-full text-white font-bold text-2xl">FinTec</div>
                ) : (
                  <Image
                    src="/finteclogodark.jpg"
                    alt="FinTec Logo"
                    fill
                    className="object-contain"
                    priority
                    unoptimized
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
                <button className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20">
                  Iniciar Sesión
                </button>
              </Link>
              
              <Link href="/auth/register">
                <button className="border border-border px-6 py-2 rounded-xl font-medium hover:bg-muted/50 transition-all duration-200">
                  Registrarse
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            variants={staggerContainer}
            initial="hidden"
            animate={isVisible ? "show" : "hidden"}
          >

            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Controla tus Finanzas con
              <span className="block bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Tasas Actualizadas
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              La aplicación financiera más completa de Venezuela. Accede a tasas oficiales del BCV, 
              precios P2P de Binance y gestiona todas tus finanzas en un solo lugar.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/auth/register">
                <button className="bg-gradient-to-r from-primary to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 flex items-center space-x-2 group">
                  <span>Comenzar Gratis</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              
              <button className="border border-border px-8 py-4 rounded-xl font-semibold text-lg hover:bg-muted/50 transition-all duration-200 flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Ver Demo</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Live Rates Preview */}
          <motion.div 
            className="max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-6 sm:p-8 lg:p-10 border border-border/20 shadow-2xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">Tasas en Vivo</h3>
                <p className="text-muted-foreground">Datos actualizados en tiempo real</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10">
                <BCVRates />
                <BinanceRatesComponent />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
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
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2">{stat.value}</div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Todo lo que necesitas para tus finanzas
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Herramientas profesionales diseñadas para el mercado venezolano
            </p>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
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
                  className={`${feature.bgColor} ${feature.borderColor} border rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group`}
                >
                  <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              ¿Listo para tomar control de tus finanzas?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Únete a miles de usuarios que ya confían en FinTec
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register">
                <button className="bg-gradient-to-r from-primary to-blue-500 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 flex items-center space-x-2 group">
                  <span>Crear Cuenta Gratis</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              
              <Link href="/auth/login">
                <button className="border border-border px-10 py-4 rounded-xl font-semibold text-lg hover:bg-muted/50 transition-all duration-200">
                  Ya tengo cuenta
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="relative w-32 h-32">
                {logoError ? (
                  <div className="flex items-center justify-center h-full text-white font-bold text-3xl">FinTec</div>
                ) : (
                  <Image
                    src="/finteclogodark.jpg"
                    alt="FinTec Logo"
                    fill
                    className="object-contain"
                    priority
                    unoptimized
                    onError={(e) => {
                                  setLogoError(true);
                    }}
                  />
                )}
              </div>
            </div>
            
            <div className="text-muted-foreground text-center md:text-right">
              <p>&copy; 2024 FinTec. Todos los derechos reservados.</p>
              <p className="text-sm mt-1">Tasas actualizadas en tiempo real desde fuentes oficiales</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
