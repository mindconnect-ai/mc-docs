import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

function ProjectCard({section}) {
  const {id, label, tagline, repo, existingSite, license, versions, available} = section;
  return (
    <div className="portal-card">
      <h2>{label}</h2>
      <p>{tagline}</p>
      <div className="portal-meta">
        License:{' '}
        {license.href ? <Link to={license.href}>{license.name}</Link> : license.name}
        {versions.length > 0 && <> · {versions.length} archived version{versions.length > 1 ? 's' : ''}</>}
        {!available && <> · not in this build</>}
      </div>
      <div className="portal-links">
        <Link className="button button--primary" to={`/${id}`}>
          Read the docs
        </Link>
        {existingSite && (
          <Link className="button button--secondary" href={existingSite}>
            Standalone site ↗
          </Link>
        )}
        {!section.private && (
          <Link className="button button--secondary" href={`https://github.com/${repo}`}>
            GitHub ↗
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const {sections} = siteConfig.customFields;
  return (
    <Layout title="Overview" description={siteConfig.tagline}>
      <main className="container">
        <header className="portal-hero">
          <img src={useBaseUrl('img/logo.svg')} alt="" />
          <h1>{siteConfig.title}</h1>
          <p>{siteConfig.tagline}</p>
        </header>
        <section className="portal-cards">
          {sections.map((s) => (
            <ProjectCard key={s.id} section={s} />
          ))}
        </section>
      </main>
    </Layout>
  );
}
