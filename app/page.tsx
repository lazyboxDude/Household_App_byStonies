import Link from "next/link";
import { CheckSquare, DollarSign } from "lucide-react";

export default function Home() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome Home 🏠
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here's what's happening today.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Summary Card */}
        <Link href="/tasks" className="block group">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-all group-hover:shadow-md group-hover:border-blue-500 dark:group-hover:border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <CheckSquare className="w-5 h-5 mr-2 text-blue-500" />
                Tasks
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                3 Pending
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" className="mr-3 rounded text-blue-600 focus:ring-blue-500" readOnly />
                <span>Take out the trash</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" className="mr-3 rounded text-blue-600 focus:ring-blue-500" readOnly />
                <span>Water the plants</span>
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <input type="checkbox" className="mr-3 rounded text-blue-600 focus:ring-blue-500" readOnly />
                <span>Grocery shopping</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Expenses Summary Card */}
        <Link href="/expenses" className="block group">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-all group-hover:shadow-md group-hover:border-green-500 dark:group-hover:border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                Finances
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                This Month
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">$1,250.00</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Shared Expenses</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">You owe</span>
              <span className="font-medium text-red-500">$45.00</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
