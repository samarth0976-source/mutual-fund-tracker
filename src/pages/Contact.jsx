import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real app, this would send to a backend
        console.log('Contact form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setFormData({ name: '', email: '', subject: '', message: '' });
        }, 3000);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
                <p className="text-muted">Have questions? We'd love to hear from you.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Contact Form */}
                <div className="lg:col-span-2">
                    <div className="bg-surface border border-border rounded-2xl p-8">
                        <h2 className="text-xl font-bold text-white mb-6">Send us a Message</h2>

                        {submitted && (
                            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                                Thank you! Your message has been sent successfully.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-muted">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-muted">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-medium text-muted">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
                                    placeholder="How can we help?"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-muted">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={6}
                                    className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                    placeholder="Tell us more about your query..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl transition-colors"
                            >
                                <Send className="w-5 h-5" />
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Get in Touch</h2>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl">
                                    <Mail className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Email</p>
                                    <p className="text-white">support@fundtracker.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-secondary/10 rounded-xl">
                                    <Phone className="w-5 h-5 text-secondary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Phone</p>
                                    <p className="text-white">+91 9999999999</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-500/10 rounded-xl">
                                    <MapPin className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted mb-1">Address</p>
                                    <p className="text-white">Mumbai, Maharashtra, India</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Business Hours</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Monday - Friday</span>
                                <span className="text-white">9:00 AM - 6:00 PM</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Saturday</span>
                                <span className="text-white">10:00 AM - 4:00 PM</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Sunday</span>
                                <span className="text-red-400">Closed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
