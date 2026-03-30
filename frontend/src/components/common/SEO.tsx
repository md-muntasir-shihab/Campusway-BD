import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
}

export function SEO({
    title,
    description = "CampusWay - The ultimate platform for university admissions and career guidance in Bangladesh.",
    keywords = "CampusWay, University Admissions, Admission Test, Bangladesh Universities, Mock Test",
    image = "/cw-banner.png", // Assuming a default banner image exists in public/
    url = "https://campusway.net",
    type = "website",
    siteName = "CampusWay"
}: SEOProps) {
    const defaultTitle = siteName;
    const pageTitle = title ? `${title} | ${siteName}` : defaultTitle;

    return (
        <Helmet>
            <title>{pageTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={pageTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />
        </Helmet>
    );
}

export default SEO;
