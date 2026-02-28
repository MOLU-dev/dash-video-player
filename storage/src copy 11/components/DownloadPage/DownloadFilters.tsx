// components/DownloadPage/DownloadFilters.tsx
import React from "react";
import { DownloadFilter, SortBy } from "./DownloadPage";

interface DownloadFiltersProps {
  filter: DownloadFilter;
  sortBy: SortBy;
  searchQuery: string;
  onFilterChange: (filter: DownloadFilter) => void;
  onSortChange: (sortBy: SortBy) => void;
  onSearchChange: (query: string) => void;
  activeTab: "downloaded" | "pending";
}

const DownloadFilters: React.FC<DownloadFiltersProps> = ({
  filter,
  sortBy,
  searchQuery,
  onFilterChange,
  onSortChange,
  onSearchChange,
  activeTab,
}) => {
  const sortOptions =
    activeTab === "downloaded"
      ? [
          { value: "date" as SortBy, label: "Date downloaded" },
          { value: "name" as SortBy, label: "Name" },
          { value: "size" as SortBy, label: "Size" },
        ]
      : [
          { value: "progress" as SortBy, label: "Progress" },
          { value: "name" as SortBy, label: "Name" },
          { value: "date" as SortBy, label: "Date added" },
        ];

  return (
    <div className="download-filters">
      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search downloads..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => onSearchChange("")}>
            ×
          </button>
        )}
      </div>

      <div className="filter-controls">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          className="sort-select"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {activeTab === "downloaded" && (
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as DownloadFilter)}
            className="filter-select"
          >
            <option value="all">All types</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default DownloadFilters;
