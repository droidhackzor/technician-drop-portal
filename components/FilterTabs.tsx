import Link from 'next/link';

type Props = {
  basePath: string;
  query: Record<string, string | undefined>;
  field: 'scope' | 'department';
  options: { label: string; value: string }[];
  activeValue: string;
};

export function FilterTabs({ basePath, query, field, options, activeValue }: Props) {
  const urlFor = (value: string) => {
    const params = new URLSearchParams();
    Object.entries({ ...query, [field]: value }).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="tab-row">
      {options.map((option) => (
        <Link key={option.value} href={urlFor(option.value)} className={`tab ${activeValue === option.value ? 'active' : ''}`}>
          {option.label}
        </Link>
      ))}
    </div>
  );
}
