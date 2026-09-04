import ContactForm from '@/components/forms/ContactForm';

export default function Contact() {
  return (
    <section className="section container">
      <div className="contact-page__inner">
        <h1>Contact</h1>
        <p>Tell us a bit about why you're reaching out, and we'll take it from there.</p>
        <ContactForm />
      </div>
    </section>
  );
}