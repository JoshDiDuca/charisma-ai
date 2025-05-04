import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@heroui/modal';
import { Accordion, AccordionItem, Button, Spinner } from '@heroui/react';
import { WebSearch } from 'shared/types/Sources/WebSearch';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (selectedItems: WebSearch[]) => void;
  searchFunction: (query: string) => Promise<WebSearch[]>;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  searchFunction
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<WebSearch[]>([]);
  const [selectedItems, setSelectedItems] = useState<WebSearch[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce search function
  const debouncedSearch = useDebounce(searchQuery, 700);

  // Handle search when debounced value changes
  React.useEffect(() => {
    if (debouncedSearch) {
      handleSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const handleSearch = async (query: string) => {
    setIsLoading(true);

    try {
      const searchResults = await searchFunction(query);

      // Preserve selected items in the results
      const combinedResults = [...searchResults];

      // Add any selected items that aren't in the new results
      selectedItems.forEach(item => {
        if (!combinedResults.some(result => result.url === item.url)) {
          combinedResults.push(item);
        }
      });

      setResults(combinedResults);
    } catch (err) {
      setError('An error occurred while searching. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setSearchQuery(e.target.value);
    if(e.target.value === ""){
      setResults([]);
    }
  };

  const toggleItemSelection = (item: WebSearch) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(i => i.url === item.url);
      if (isSelected) {
        return prev.filter(i => i.url !== item.url);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleAddSelected = () => {
    onAdd(selectedItems);
    setSelectedItems([]);
    setSearchQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="inside">
      <ModalContent style={{ maxWidth: '70vw' }}>
        <ModalHeader>
          <h2 className="text-xl font-semibold">Search Items</h2>
        </ModalHeader>
        <ModalBody className="max-h-[60vh] overflow-y-auto">
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              placeholder="Search..."
              className="w-full p-4 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {isLoading && (
            <div className="flex justify-center my-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="text-red-500 mb-4">{error}</div>
          )}

          {/* Selected items in accordion */}
          {selectedItems.length > 0 && (
            <div className="mb-4">
              <Accordion>
                <AccordionItem
                  key="selected-items"
                  title={`${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} selected`}
                  className="bg-blue-50"
                >
                  <div className="p-2">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                            Remove
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedItems.map((item) => (
                          <tr key={`selected-${item.url}`} className="bg-white hover:bg-gray-50">
                            <td className="px-3 py-4">
                              <button
                                onClick={() => toggleItemSelection(item)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-col">
                                <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                                <a href={item.url} className="text-xs text-blue-600 truncate hover:underline" target="_blank" rel="noopener noreferrer">
                                  {item.url}
                                </a>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          )}


          {results.length > 0 && (
            <div className="mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      Select
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((item) => {
                    const isSelected = selectedItems.some(i => i.url === item.url);
                    return (
                      <tr key={item.url} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-col">
                            <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                            <a href={item.url} className="text-xs text-blue-600 truncate hover:underline" target="_blank" rel="noopener noreferrer">
                              {item.url}
                            </a>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {searchQuery === '' || results.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              {isLoading ? <Spinner /> : `No results found`}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex justify-between w-full">
            <div>
              {selectedItems.length > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedItems.length} item(s) selected
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAddSelected}
                disabled={selectedItems.length === 0}
              >
                Add Selected
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>

  );
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default SearchModal;
