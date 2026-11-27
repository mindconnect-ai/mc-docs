// Footer copyright with a license line that depends on the section being read:
// Mindconnect and Semantic UI are Apache-2.0, Architector is proprietary and
// free to use. Outside a docs section (landing page) all licenses are listed.
import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useActivePlugin} from '@docusaurus/plugin-content-docs/client';

function LicenseLink({license}) {
  return license.href ? <Link to={license.href}>{license.name}</Link> : <>{license.name}</>;
}

export default function FooterCopyright({copyright}) {
  const {siteConfig} = useDocusaurusContext();
  const sections = siteConfig.customFields.sections;
  const active = useActivePlugin({failfast: false});
  const section = active && sections.find((s) => s.id === active.pluginId);

  return (
    <div className="footer__copyright">
      <div className="footer__license">
        {section ? (
          <>
            {section.label} license: <LicenseLink license={section.license} />.
            {section.license.note && <> {section.license.note}</>}
          </>
        ) : (
          sections.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && ' · '}
              {s.label}: <LicenseLink license={s.license} />
            </React.Fragment>
          ))
        )}
      </div>
      <div>{copyright}</div>
    </div>
  );
}
