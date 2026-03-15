import type { Metadata } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono, Geist } from 'next/font/google'
import React from 'react'
import './globals.css'
import { cn } from "@/lib/utils";

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'First Step',
  description: 'Tu primer paso hacia el autoconocimiento',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={cn(instrumentSerif.variable, jetbrainsMono.variable, "font-sans", geist.variable)}>
      <body className="bg-[var(--color-base)] min-h-screen">
        {children}
      </body>
    </html>
  )
}
