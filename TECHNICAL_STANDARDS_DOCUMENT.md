# ⚙️ Technical Standards Document

## 🏗️ **Minimum Technical Standards & Development Principles**

All development must adhere to strict functional development principles and Test-Driven Development (TDD) methodologies. Code must be written with pure functions, immutable data structures, and clear separation of concerns. Every function must have comprehensive unit tests written before implementation, with test coverage requirements of 90% minimum. The codebase must follow functional programming paradigms, avoiding side effects and ensuring predictable behavior. All components must be stateless where possible, with state management handled through functional patterns and immutable updates. Error handling must be explicit and functional, using Either/Result patterns rather than exceptions where appropriate.

The technology stack is strictly defined: D1 database for initial development with full database portability to ensure seamless migration to PostgreSQL or SQL Server for production. Frontend must use React with TypeScript, adhering to strict TypeScript principles with no `any` types allowed. Backend uses Node.js with TypeScript, following the same strict typing requirements. Python code is permitted only where necessary for image processing and AI integration. All code must use semantic naming conventions without comments, as the code should be self-documenting through clear function and variable names. The application must be designed for Cloudflare deployment using Cloudflare React Router, with the database schema as the foundational design element that all other components must work around.

---

## 🗄️ **Database-First Design & Cloudflare Architecture**

Development must start with the database schema design, as all application logic must be built around the data model. The schema must be designed for maximum portability, using standard SQL constructs that work across D1, PostgreSQL, and SQL Server. All database operations must use prepared statements and proper indexing for performance. The schema must support the complete workflow: crypto_pairs for market data, chart_screenshots for image metadata, chart_mappings for anonymization relationships, ai_analyses for AI results, and strategies for user-created trading strategies. All foreign key relationships must be properly defined with cascading rules for data integrity.

The Cloudflare architecture requires stateless application design with edge computing principles. All API endpoints must be idempotent and cacheable where appropriate. File storage must use Cloudflare R2 for images and exports. The React application must use Cloudflare Pages with React Router for client-side routing. All environment variables must be managed through Cloudflare Workers secrets. The application must be designed for horizontal scaling with no server-side state dependencies. Performance requirements include sub-2-second page load times and real-time progress updates through WebSocket connections or Server-Sent Events, with proper error boundaries and graceful degradation for network issues.


