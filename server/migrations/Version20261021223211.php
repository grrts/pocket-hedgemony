<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Delete account (#229, SAVE-198 … SAVE-208): an entitlement outlives its account (the account
 * becomes null), and an Apple identity keeps its refresh token and client id to revoke on deletion.
 */
final class Version20261021223211 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Entitlements outlive a deleted account; Apple identities keep their refresh token';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform, 'Migrations are written for PostgreSQL; a local SQLite database uses doctrine:schema:update (docs/deploy.md).');
        $this->addSql('ALTER TABLE entitlement DROP CONSTRAINT fk_fa4480219b6b5fba');
        $this->addSql('ALTER TABLE entitlement ALTER account_id DROP NOT NULL');
        $this->addSql('ALTER TABLE entitlement ADD CONSTRAINT FK_FA4480219B6B5FBA FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE identity ADD apple_refresh_token TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE identity ADD apple_client_id VARCHAR(191) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE entitlement DROP CONSTRAINT FK_FA4480219B6B5FBA');
        $this->addSql('ALTER TABLE entitlement ALTER account_id SET NOT NULL');
        $this->addSql('ALTER TABLE entitlement ADD CONSTRAINT fk_fa4480219b6b5fba FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE identity DROP apple_refresh_token');
        $this->addSql('ALTER TABLE identity DROP apple_client_id');
    }
}
