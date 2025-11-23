import Link from "next/link";
import { 
  CheckSquare, 
  DollarSign, 
  Calendar, 
  ShoppingCart, 
  Settings, 
  Users 
} from "lucide-react";

export default function Home() {
  const menuItems = [
    {
      title: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "Manage chores & to-dos",
      count: "3 Pending"
    },
    {
      title: "Finances",
      href: "/expenses",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description: "Track shared expenses",
      count: "$45 Owed"
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      description: "Events & planning",
      count: "2 Today"
    },
    {
      title: "Shopping",
      href: "/shopping",
      icon: ShoppingCart,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      description: "Groceries & supplies",
      count: "5 Items"
    },
    {
      title: "Household",
      href: "/settings", // Placeholder
      icon: Users,
      color: "text-pink-500",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      description: "Members & roles",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      color: "text-gray-500",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      description: "App preferences",
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome Home 🏠
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          What would you like to do today?
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.title} href={item.href} className="block group">
              <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.count && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {item.count}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
