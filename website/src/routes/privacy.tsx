import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header/Header'
import { PageContainer } from '@/components/PageContainer'
import { Footer } from '@/components/Footer'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <PageContainer>
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p>
              Oscar ("we", "our", or "us") operates the Oscar Chrome extension and the getoscar.ai website.
              This Privacy Policy explains how we collect, use, and protect your information when you use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Information You Provide</h3>
            <p>
              When you use the Oscar Chrome extension to share a ChatGPT conversation by typing "/share", we collect:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>The conversation messages (both user and assistant messages)</li>
              <li>Timestamps of when conversations are shared</li>
              <li>The URL of the ChatGPT conversation</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Automatically Collected Information</h3>
            <p>
              We may collect:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Browser type and version</li>
              <li>Usage statistics (anonymized)</li>
              <li>Error logs for debugging purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Create shareable links for your ChatGPT conversations</li>
              <li>Store and display shared conversations on getoscar.ai</li>
              <li>Improve our services and user experience</li>
              <li>Provide technical support</li>
              <li>Ensure security and prevent abuse</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Sharing and Public Access</h2>
            <p>
              <strong>Important:</strong> When you type "/share" in ChatGPT, your conversation becomes publicly accessible
              through a unique link at getoscar.ai/chat/[id]. Anyone with this link can view the shared conversation.
            </p>
            <p className="mt-4">
              We do not sell, trade, or rent your personal information to third parties. We may share anonymized,
              aggregated data for analytics and research purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
            <p>
              We store shared conversations on secure servers. We implement reasonable security measures to protect
              your data, but no method of transmission over the internet is 100% secure.
            </p>
            <p className="mt-4">
              Shared conversations are stored indefinitely unless you request deletion. Local storage in the Chrome
              extension is used only to cache previously shared conversations for your convenience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Chrome Extension Permissions</h2>
            <p>The Oscar Chrome extension requires the following permissions:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>activeTab:</strong> To detect when you type "/share" and extract conversation content from ChatGPT
              </li>
              <li>
                <strong>storage:</strong> To locally cache your shared conversations
              </li>
              <li>
                <strong>Host permissions (chatgpt.com):</strong> To run only on ChatGPT pages
              </li>
            </ul>
            <p>
              The extension only activates when you explicitly type "/share" and press Enter. No data is collected
              or transmitted without your explicit action.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Request deletion of your shared conversations</li>
              <li>Access the data we have about you</li>
              <li>Opt-out of any future communications</li>
              <li>Uninstall the Chrome extension at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
            <p>
              We may use cookies and similar technologies to improve user experience and analyze usage patterns.
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p>
              Our services are not intended for users under 13 years of age. We do not knowingly collect
              information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of any significant
              changes by updating the "Last updated" date at the top of this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            </p>
            <p className="mt-4">
              Email: <a href="mailto:privacy@getoscar.ai" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@getoscar.ai</a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </PageContainer>
  )
}
