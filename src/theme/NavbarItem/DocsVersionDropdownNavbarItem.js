// Each section has its own version dropdown. Show it only inside its section,
// so the navbar does not carry every project's dropdown on every page.
import React from 'react';
import OriginalDropdown from '@theme-original/NavbarItem/DocsVersionDropdownNavbarItem';
import {useActivePlugin} from '@docusaurus/plugin-content-docs/client';

export default function DocsVersionDropdownNavbarItem(props) {
  const active = useActivePlugin({failfast: false});
  if (!active || active.pluginId !== props.docsPluginId) return null;
  return <OriginalDropdown {...props} />;
}
