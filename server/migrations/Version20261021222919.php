<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Deleting an account: a purchase outlives its account as the record of the sale (SAVE-199, SAVE-202),
 * and a Sign in with Apple identity keeps its refresh token and client id so the
 * token can be revoked when the account is deleted (SAVE-203, SAVE-204).
 */
final class Version20261021222919 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Purchases outlive a deleted account; Apple identities keep their refresh token';
    }

    public function up(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform, 'Migrations are written for PostgreSQL (docs/deploy.md).');
        $this->addSql('ALTER TABLE entitlement DROP CONSTRAINT fk_fa4480219b6b5fba');
        $this->addSql('ALTER TABLE entitlement ALTER account_id DROP NOT NULL');
        $this->addSql('ALTER TABLE entitlement ADD CONSTRAINT FK_FA4480219B6B5FBA FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE identity ADD apple_refresh_token TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE identity ADD apple_client_id VARCHAR(191) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->abortIf(!$this->connection->getDatabasePlatform() instanceof PostgreSQLPlatform, 'Migrations are written for PostgreSQL (docs/deploy.md).');
        $this->addSql('ALTER TABLE entitlement DROP CONSTRAINT FK_FA4480219B6B5FBA');
        $this->addSql('ALTER TABLE entitlement ALTER account_id SET NOT NULL');
        $this->addSql('ALTER TABLE entitlement ADD CONSTRAINT fk_fa4480219b6b5fba FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE identity DROP apple_refresh_token');
        $this->addSql('ALTER TABLE identity DROP apple_client_id');
    }
}
