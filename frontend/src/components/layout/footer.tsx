import Link from 'next/link'
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

export function Footer() {
  const footerLinks = {
    'Company': [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
      { name: 'Blog', href: '/blog' },
    ],
    'Support': [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Account', href: '/account' },
      { name: 'Redeem Gift Cards', href: '/gift-cards' },
    ],
    'Legal': [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Corporate Information', href: '/corporate' },
    ],
    'Connect': [
      { name: 'Gift Cards', href: '/gift-cards' },
      { name: 'Media Center', href: '/media' },
      { name: 'Investor Relations', href: '/investors' },
      { name: 'Jobs', href: '/jobs' },
    ],
  }

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
    { name: 'YouTube', icon: Youtube, href: 'https://youtube.com' },
  ]

  return (
    <footer className="bg-netflix-black border-t border-gray-800 mt-20">
      <div className="container mx-auto px-4 py-12">
        {/* Social Links */}
        <div className="flex space-x-6 mb-8">
          {socialLinks.map((social) => {
            const Icon = social.icon
            return (
              <Link
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Icon className="h-6 w-6" />
                <span className="sr-only">{social.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Service Code and Copyright */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              Service Code: 1-800-STREAMFLIX
            </div>
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} StreamFlix, Inc. All rights reserved.
            </div>
          </div>
          
          <div className="mt-4 text-gray-500 text-xs">
            <p>
              StreamFlix is a subscription streaming service. Content availability may vary by region.
              Some content may require additional fees. Streaming quality depends on internet connection.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
