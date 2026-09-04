import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="section section--a container">
        <h1>Accessibility that goes beyond the checklist.</h1>
        <p>I partner with small-medium-sized teams to embed genuine inclusion into digital products.</p>
      </section>

      <section className="section section--b container">
        <h2>Why Beyond Compliance</h2>
        <p>
          The focus of accessibility testing is on compliance checklists. There is a gap
          between what's deemed accessible and the experience of people with disabilities.
          As a person with a disability, I use my lived experience to evaluate your digital
          offerings using Beyond Compliance principles. Together, we can make your digital
          products and services as accessible and inclusive as possible.
        </p>
        <Link href="/beyond-compliance" className="text-link">
          Learn more about Beyond Compliance principles →
        </Link>
      </section>

      <section className="section section--c container">
        <h2>Services</h2>
        <div className="card-grid">

          <div className="card">
            <h3>Full Website Audit</h3>
            <p>Comprehensive WCAG 2.2 AA review using automated testing, manual keyboard testing, and lived-experience evaluation. Delivered as a prioritized, actionable report.</p>
            <p className="card__scope">Medium sites (5–15 pages, representative sampling where applicable)</p>
          </div>

          <div className="card">
            <h3>Mini Website Audit</h3>
            <p>Automated + manual + single screen reader pass on a 3–5 page site. Lighter report format, same methodology, honest scope.</p>
            <p className="card__scope">Small sites (3–5 pages, representative sampling where applicable)</p>
          </div>

          <div className="card">
            <h3>PDF Remediation</h3>
            <p>Tag remediation on exported PDFs — heading structure, reading order, artifacts, TOC, links.</p>
            <p className="card__scope">Complexity-based pricing</p>
          </div>

          <div className="card">
            <h3>Word / Google Docs / LibreOffice Accessibility Review</h3>
            <p>Review and remediation of headings, reading order, alt text, table structure, and styles — ensuring your source documents are accessible before they're ever exported or shared.</p>
            <p className="card__scope">Complexity-based pricing</p>
          </div>

          <div className="card">
            <h3>PowerPoint / Slides Remediation</h3>
            <p>Slide-by-slide review of reading order, alt text, contrast, and native layout use — so screen reader users experience your presentation the way it was designed.</p>
            <p className="card__scope">Complexity-based pricing</p>
          </div>

        </div>
        <Link href="/services" className="text-link">
          Read more on the Services page →
        </Link>
      </section>

      <section className="section section--a container">
        <h2>Get in touch</h2>
        <p>If you want to ask a question, get some technical help, or propose a project, contact me.</p>
        <Link href="/contact" className="text-link">
          Visit my Contact page →
        </Link>
      </section>
    </>
  );
}